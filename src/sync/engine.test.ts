import { beforeEach, describe, expect, it } from 'vitest'
import { NexoDB } from '../db/database'
import type { Task } from '../db/types'
import { pull, push } from './engine'
import type { OutgoingRow, RemoteRow, RemoteStore } from './remote'

/** Servidor em memória com carimbo de tempo crescente, como o gatilho do Postgres. */
function fakeServer() {
  const rows = new Map<string, RemoteRow>()
  let clock = Date.UTC(2026, 9, 13, 12, 0, 0)
  const store: RemoteStore = {
    async upsert(list: OutgoingRow[]) {
      for (const r of list)
        rows.set(`${r.collection}:${r.id}`, { ...r, data: r.data ? structuredClone(r.data) : null, updated_at: new Date(++clock).toISOString() })
    },
    async changesSince(since, limit) {
      return [...rows.values()]
        .filter((r) => !since || r.updated_at > since)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.id.localeCompare(b.id))
        .slice(0, limit)
    },
  }
  return { store, rows }
}

const task = (id: string, title: string, number = 1): Task => ({
  id,
  number,
  title,
  notes: '',
  status: 'todo',
  priority: 'none',
  labels: [],
  projectId: null,
  dueDate: null,
  subtasks: [],
  createdAt: 1,
  updatedAt: 1,
  completedAt: null,
})

let a: NexoDB
let b: NexoDB
let n = 0
beforeEach(async () => {
  n++
  a = new NexoDB(`device-a-${n}`, { trackChanges: true })
  b = new NexoDB(`device-b-${n}`, { trackChanges: true })
})

describe('sincronização entre aparelhos', () => {
  it('leva criações e exclusões de um aparelho para o outro', async () => {
    const { store } = fakeServer()
    await a.tasks.put(task('t1', 'Criada no A'))
    expect(await push(a, store)).toBe(1)
    expect(await a.outbox.count()).toBe(0)

    await pull(b, store)
    expect((await b.tasks.get('t1'))?.title).toBe('Criada no A')
    expect(await b.outbox.count()).toBe(0) // o que veio da nuvem não volta para a fila

    await b.tasks.delete('t1')
    await push(b, store)
    await pull(a, store)
    expect(await a.tasks.get('t1')).toBeUndefined()
  })

  it('não sobrescreve alteração local ainda não enviada', async () => {
    const { store } = fakeServer()
    await a.tasks.put(task('t1', 'v1'))
    await push(a, store)
    await pull(b, store)

    await b.tasks.update('t1', { title: 'editada no B' })
    await push(b, store)
    await a.tasks.update('t1', { title: 'editada no A (offline)' })
    await pull(a, store)
    expect((await a.tasks.get('t1'))?.title).toBe('editada no A (offline)')

    await push(a, store)
    await pull(b, store)
    expect((await b.tasks.get('t1'))?.title).toBe('editada no A (offline)')
  })

  it('contadores convergem para o maior valor', async () => {
    const { store } = fakeServer()
    await a.counters.put({ name: 'task', value: 7 })
    await push(a, store)
    await b.counters.put({ name: 'task', value: 3 })
    await b.outbox.clear()
    await pull(b, store)
    expect((await b.counters.get('task'))?.value).toBe(7)
  })

  it('execuções duplicadas da mesma rotina e dia convergem para o id determinístico', async () => {
    const { store, rows } = fakeServer()
    const base = { routineId: 'r1', date: '2026-10-13', steps: [], status: 'done' as const, note: '', completedAt: 1, updatedAt: 1 }
    await a.routineLogs.put({ ...base, id: 'aleatorio-antigo' })
    await push(a, store)
    await b.routineLogs.put({ ...base, id: 'r1:2026-10-13' })
    await push(b, store)

    await pull(a, store)
    expect((await a.routineLogs.toArray()).map((l) => l.id)).toEqual(['r1:2026-10-13'])
    await push(a, store) // envia a remoção da duplicata
    expect(rows.get('routineLogs:aleatorio-antigo')?.deleted).toBe(true)

    await pull(b, store)
    expect((await b.routineLogs.toArray()).map((l) => l.id)).toEqual(['r1:2026-10-13'])
  })

  it('pagina o recebimento e guarda o cursor', async () => {
    const { store } = fakeServer()
    await a.tasks.bulkPut(Array.from({ length: 1200 }, (_, i) => task(`t${i}`, `Tarefa ${i}`, i + 1)))
    await push(a, store)
    expect(await pull(b, store)).toBe(1200)
    expect(await b.tasks.count()).toBe(1200)
    expect(await b.meta.get('pulledAt')).toBeTruthy()
  })
})
