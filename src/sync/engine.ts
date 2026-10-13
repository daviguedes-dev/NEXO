import { useSyncExternalStore } from 'react'
import { TABLES, db, markRemote, onLocalChange, type NexoDB, type TableName } from '../db/database'
import type { OutgoingRow, RemoteRow, RemoteStore } from './remote'

/* ---------------------------------------------------------------- estado */

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'offline' | 'error'
  pending: number
  lastSyncedAt: number | null
  message?: string
}

let status: SyncStatus = { state: 'idle', pending: 0, lastSyncedAt: null }
const listeners = new Set<() => void>()
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  listeners.forEach((l) => l())
}
export const getSyncStatus = () => status
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

/* ------------------------------------------------------- envio e recebimento */

const PUSH_BATCH = 400
const PULL_PAGE = 1000
/** Relê um pequeno intervalo para não perder gravações concluídas fora de ordem no servidor. */
const PULL_OVERLAP_MS = 60_000
const CURSOR_KEY = 'pulledAt'

/** Envia a fila local. Cada entrada só sai da fila se não mudou durante o envio. */
export async function push(local: NexoDB, remote: RemoteStore): Promise<number> {
  let sent = 0
  for (let round = 0; round < 1000; round++) {
    const entries = await local.outbox.orderBy('at').limit(PUSH_BATCH).toArray()
    if (!entries.length) break
    const rows: OutgoingRow[] = []
    for (const e of entries) {
      const record = e.op === 'put' ? ((await local.table(e.table).get(e.id)) as Record<string, unknown> | undefined) : undefined
      rows.push(record ? { collection: e.table, id: e.id, data: record, deleted: false } : { collection: e.table, id: e.id, data: null, deleted: true })
    }
    await remote.upsert(rows)
    await local.transaction('rw', local.outbox, async () => {
      for (const e of entries) {
        const current = await local.outbox.get(e.key)
        if (current && current.at === e.at) await local.outbox.delete(e.key)
      }
    })
    sent += entries.length
  }
  return sent
}

/** Aplica alterações da nuvem. Registros com alteração local pendente são preservados (a local vai em seguida). */
export async function applyRemote(local: NexoDB, rows: RemoteRow[]): Promise<void> {
  if (!rows.length) return
  await local.transaction('rw', [...TABLES, 'outbox'], async (tx) => {
    markRemote(tx)
    const pending = new Set((await local.outbox.toCollection().primaryKeys()) as string[])
    for (const row of rows) {
      if (!(TABLES as readonly string[]).includes(row.collection)) continue
      if (pending.has(`${row.collection}:${row.id}`)) continue
      const table = local.table(row.collection)
      if (row.deleted || !row.data) {
        await table.delete(row.id)
        continue
      }
      if (row.collection === 'counters') {
        const current = (await table.get(row.id)) as { value: number } | undefined
        await table.put({ name: row.id, value: Math.max(current?.value ?? 0, Number(row.data.value) || 0) })
        continue
      }
      const record = { ...row.data, id: row.id }
      if (row.collection === 'routineLogs' && (await resolveDuplicateLog(local, record as never))) continue
      await table.put(record)
    }
  })
}

/**
 * Execuções de rotina usam id determinístico (rotina:data). Se uma execução antiga, com
 * id aleatório, colidir com a determinística, mantém-se a determinística e a outra é
 * removida localmente e na nuvem. Retorna true se o registro recebido deve ser ignorado.
 */
async function resolveDuplicateLog(local: NexoDB, record: { id: string; routineId: string; date: string }): Promise<boolean> {
  const canonical = `${record.routineId}:${record.date}`
  const others = await local.routineLogs
    .where('[routineId+date]')
    .equals([record.routineId, record.date])
    .filter((l) => l.id !== record.id)
    .toArray()
  if (!others.length) return false
  const at = Date.now()
  if (record.id === canonical) {
    for (const o of others) {
      await local.routineLogs.delete(o.id)
      await local.outbox.put({ key: `routineLogs:${o.id}`, table: 'routineLogs', id: o.id, op: 'delete', at })
    }
    return false
  }
  if (others.some((o) => o.id === canonical)) {
    await local.outbox.put({ key: `routineLogs:${record.id}`, table: 'routineLogs', id: record.id, op: 'delete', at })
    return true
  }
  return false
}

/** Busca e aplica tudo o que mudou na nuvem desde a última vez. */
export async function pull(local: NexoDB, remote: RemoteStore): Promise<number> {
  const saved = (await local.meta.get(CURSOR_KEY))?.value as string | undefined
  let since = saved ? new Date(new Date(saved).getTime() - PULL_OVERLAP_MS).toISOString() : null
  let newest = saved ?? null
  let received = 0
  for (let page = 0; page < 10_000; page++) {
    const rows = await remote.changesSince(since, PULL_PAGE)
    await applyRemote(local, rows)
    received += rows.length
    if (rows.length) {
      const last = rows[rows.length - 1].updated_at
      since = last
      if (!newest || last > newest) newest = last
    }
    if (rows.length < PULL_PAGE) break
  }
  if (newest) await local.meta.put({ key: CURSOR_KEY, value: newest })
  return received
}

/* ------------------------------------------------------------- execução */

let current: { run: () => Promise<void>; stop: () => void } | null = null

const isNetworkError = (e: unknown) =>
  !navigator.onLine ||
  (e instanceof TypeError && /fetch|network/i.test(e.message)) ||
  (typeof e === 'object' && e !== null && 'status' in e && (e as { status?: number }).status === 0)

async function refreshPending(local: NexoDB) {
  try {
    setStatus({ pending: await local.outbox.count() })
  } catch {
    /* banco fechado durante a troca de conta */
  }
}

/** Inicia a sincronização automática da conta. Retorna a função que a encerra. */
export function startSync(remote: RemoteStore): () => void {
  current?.stop()
  const local = db
  let running = false
  let again = false
  let stopped = false
  let timer: number | undefined

  const run = async () => {
    if (stopped) return
    if (running) {
      again = true
      return
    }
    running = true
    setStatus({ state: 'syncing', message: undefined })
    try {
      await push(local, remote)
      await pull(local, remote)
      if (!stopped) setStatus({ state: 'idle', lastSyncedAt: Date.now() })
    } catch (e) {
      if (!stopped)
        setStatus(
          isNetworkError(e)
            ? { state: 'offline' }
            : { state: 'error', message: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e) },
        )
    } finally {
      running = false
      await refreshPending(local)
      if (again && !stopped) {
        again = false
        schedule(400)
      }
    }
  }
  const schedule = (ms: number) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(run, ms)
  }

  const offChange = onLocalChange(() => {
    void refreshPending(local)
    schedule(1200)
  })
  const onOnline = () => schedule(200)
  const onVisible = () => document.visibilityState === 'visible' && schedule(200)
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  const interval = window.setInterval(() => schedule(0), 60_000)

  setStatus({ state: 'syncing', pending: 0, lastSyncedAt: null, message: undefined })
  void refreshPending(local)
  void run()

  const stop = () => {
    stopped = true
    window.clearTimeout(timer)
    window.clearInterval(interval)
    offChange()
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    if (current?.stop === stop) current = null
  }
  current = { run, stop }
  return stop
}

/** Força uma sincronização agora (botão “Sincronizar”). */
export async function syncNow(): Promise<void> {
  await current?.run()
}

export const syncActive = () => current !== null
export type { TableName }
