import { db } from './database'
import type { Activity, EntityType } from './types'
import { todayISO } from '../lib/dates'
import { entityKey, uid } from '../lib/ids'

const TABLE_OF: Record<EntityType, string> = {
  task: 'tasks',
  project: 'projects',
  routine: 'routines',
  method: 'methods',
  run: 'methodRuns',
  post: 'posts',
  template: 'templates',
}

/**
 * Próximo número sequencial do tipo (TSK-1, TSK-2…). Considera também o maior número
 * já presente na tabela, que pode ter vindo de outro aparelho pela sincronização.
 * Use dentro de uma transação que inclua `counters` e a tabela do tipo.
 */
export async function nextNumber(type: EntityType): Promise<number> {
  const current = await db.counters.get(type)
  const last = (await db.table(TABLE_OF[type]).orderBy('number').last()) as { number: number } | undefined
  const value = Math.max(current?.value ?? 0, last?.number ?? 0) + 1
  await db.counters.put({ name: type, value })
  return value
}

interface LogInput {
  type: EntityType
  id: string
  number: number
  title: string
  action: string
  message: string
}

/** Acrescenta um registro à trilha de histórico. Registros nunca são editados. */
export async function logActivity(input: LogInput, at: number = Date.now()): Promise<Activity> {
  const entry: Activity = {
    id: uid(),
    at,
    day: todayISO(new Date(at)),
    entityType: input.type,
    entityId: input.id,
    entityKey: entityKey(input.type, input.number),
    entityTitle: input.title,
    action: input.action,
    message: input.message,
  }
  await db.activity.add(entry)
  return entry
}
