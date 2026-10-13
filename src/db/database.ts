import Dexie, { type DBCore, type DBCoreMutateRequest, type EntityTable, type Transaction } from 'dexie'
import type { Activity, Counter, Label, Method, MethodRun, Post, PostTemplate, Project, Routine, RoutineLog, Task } from './types'

/** Todas as tabelas de dados, na ordem usada por backup, restauração e sincronização. */
export const TABLES = ['tasks', 'labels', 'projects', 'routines', 'routineLogs', 'methods', 'methodRuns', 'templates', 'posts', 'activity', 'counters'] as const

export type TableName = (typeof TABLES)[number]

/** Alteração local ainda não enviada à nuvem (uma por registro; a mais recente vence). */
export interface OutboxEntry {
  key: string
  table: TableName
  id: string
  op: 'put' | 'delete'
  at: number
}

export interface MetaEntry {
  key: string
  value: string | number
}

export class NexoDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  labels!: EntityTable<Label, 'id'>
  projects!: EntityTable<Project, 'id'>
  routines!: EntityTable<Routine, 'id'>
  routineLogs!: EntityTable<RoutineLog, 'id'>
  methods!: EntityTable<Method, 'id'>
  methodRuns!: EntityTable<MethodRun, 'id'>
  templates!: EntityTable<PostTemplate, 'id'>
  posts!: EntityTable<Post, 'id'>
  activity!: EntityTable<Activity, 'id'>
  counters!: EntityTable<Counter, 'name'>
  outbox!: EntityTable<OutboxEntry, 'key'>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor(name: string, options: { trackChanges?: boolean } = {}) {
    super(name)
    this.version(1).stores({
      tasks: 'id, &number, status, priority, projectId, dueDate, updatedAt, *labels',
      labels: 'id, name',
      projects: 'id, &number, status',
      routines: 'id, &number',
      routineLogs: 'id, routineId, date, &[routineId+date]',
      methods: 'id, &number',
      methodRuns: 'id, &number, methodId, status',
      templates: 'id, &number',
      posts: 'id, &number, status, scheduledDate, templateId',
      activity: 'id, at, day, entityId',
      counters: 'name',
    })
    // v2: números e execuções diárias deixam de ser únicos no índice (dois aparelhos
    // podem criar registros offline ao mesmo tempo); fila de sincronização e metadados.
    this.version(2).stores({
      tasks: 'id, number, status, priority, projectId, dueDate, updatedAt, *labels',
      projects: 'id, number, status',
      routines: 'id, number',
      routineLogs: 'id, routineId, date, [routineId+date]',
      methods: 'id, number',
      methodRuns: 'id, number, methodId, status',
      templates: 'id, number',
      posts: 'id, number, status, scheduledDate, templateId',
      outbox: 'key, at',
      meta: 'key',
    })
    if (options.trackChanges) trackChanges(this)
  }
}

/* ------------------------------------------------------ rastreio de mudanças */

const SYNCED = new Set<string>(TABLES)
const listeners = new Set<() => void>()

/** Avisado depois de cada alteração local registrada na fila. */
export function onLocalChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Transações marcadas aqui aplicam dados vindos da nuvem e não voltam para a fila. */
export function markRemote(tx: Transaction) {
  ;(tx as Transaction & { nexoRemote?: boolean }).nexoRemote = true
}
const isRemote = () => !!(Dexie.currentTransaction as (Transaction & { nexoRemote?: boolean }) | null)?.nexoRemote

/**
 * Middleware do Dexie: toda gravação em tabela sincronizada também grava a
 * entrada correspondente na fila `outbox`, dentro da mesma transação (atômico).
 */
function trackChanges(database: Dexie) {
  database.use({
    stack: 'dbcore',
    name: 'nexo-outbox',
    create(down: DBCore): DBCore {
      return {
        ...down,
        transaction(stores, mode, options) {
          const scope = mode === 'readwrite' && stores.some((s) => SYNCED.has(s)) && !stores.includes('outbox') ? [...stores, 'outbox'] : stores
          return down.transaction(scope, mode, options)
        },
        table(name) {
          const table = down.table(name)
          if (!SYNCED.has(name)) return table
          const keyPath = table.schema.primaryKey.keyPath as string
          return {
            ...table,
            async mutate(req: DBCoreMutateRequest) {
              const remote = isRemote()
              let removed: string[] = []
              if (req.type === 'deleteRange' && !remote) {
                const res = await table.query({ trans: req.trans, values: false, query: { index: table.schema.primaryKey, range: req.range } })
                removed = res.result as string[]
              }
              const result = await table.mutate(req)
              if (remote) return result
              let keys: string[] = []
              let op: OutboxEntry['op'] = 'put'
              if (req.type === 'add' || req.type === 'put') keys = req.values.map((v) => (v as Record<string, string>)[keyPath])
              else if (req.type === 'delete') {
                keys = req.keys as string[]
                op = 'delete'
              } else {
                keys = removed
                op = 'delete'
              }
              if (keys.length) {
                const at = Date.now()
                await down.table('outbox').mutate({
                  trans: req.trans,
                  type: 'put',
                  values: keys.map((id) => ({ key: `${name}:${id}`, table: name, id, op, at })),
                })
                queueMicrotask(() => listeners.forEach((l) => l()))
              }
              return result
            },
          }
        },
      }
    },
  })
}

/* ------------------------------------------------------- banco ativo */

/** Banco do modo "sem conta" (o mesmo usado antes do login existir). */
export const LOCAL_DB_NAME = 'nexo'

/**
 * Banco ativo. É uma ligação "viva" de módulo: quem importa `db` sempre enxerga
 * o banco atual, inclusive depois de trocar de conta.
 */
export let db = new NexoDB(LOCAL_DB_NAME)

/** Abre o banco local da conta (um por usuário) ou o banco sem conta. */
export function selectDatabase(account: { userId: string } | 'local'): NexoDB {
  const name = account === 'local' ? LOCAL_DB_NAME : `nexo-u-${account.userId}`
  if (db.name !== name) {
    db.close()
    db = new NexoDB(name, { trackChanges: account !== 'local' })
  }
  return db
}
