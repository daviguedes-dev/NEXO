import { db } from './database'
import { logActivity, nextNumber } from './history'
import type { ID, ISODate, Routine, RoutineLog } from './types'
import { formatShortDate, todayISO } from '../lib/dates'
import { uid } from '../lib/ids'

const TX = [db.routines, db.routineLogs, db.activity, db.counters] as const

export type RoutineInput = Partial<Omit<Routine, 'id' | 'number' | 'createdAt' | 'updatedAt'>> & { name: string }

function log(r: Routine, action: string, message: string) {
  return logActivity({ type: 'routine', id: r.id, number: r.number, title: r.name, action, message })
}

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  return db.transaction('rw', TX, async () => {
    const now = Date.now()
    const routine: Routine = {
      id: uid(),
      number: await nextNumber('routine'),
      name: input.name.trim(),
      description: input.description ?? '',
      frequency: input.frequency ?? { kind: 'daily' },
      time: input.time ?? null,
      priority: input.priority ?? 'medium',
      steps: input.steps ?? [],
      startDate: input.startDate ?? todayISO(),
      archived: false,
      createdAt: now,
      updatedAt: now,
    }
    await db.routines.add(routine)
    await log(routine, 'created', 'criou a rotina')
    return routine
  })
}

/** Editar uma rotina nunca altera execuções passadas: cada registro guarda as etapas da época. */
export async function updateRoutine(id: ID, patch: Partial<Omit<Routine, 'id' | 'number' | 'createdAt'>>) {
  await db.transaction('rw', TX, async () => {
    const before = await db.routines.get(id)
    if (!before) return
    const next = { ...before, ...patch, updatedAt: Date.now() }
    await db.routines.put(next)
    if (patch.archived !== undefined && patch.archived !== before.archived) {
      await log(next, patch.archived ? 'archived' : 'restored', patch.archived ? 'arquivou a rotina (histórico preservado)' : 'reativou a rotina')
    } else {
      await log(next, 'updated', 'atualizou a configuração da rotina')
    }
  })
}

export async function deleteRoutine(id: ID) {
  await db.transaction('rw', TX, async () => {
    const r = await db.routines.get(id)
    if (!r) return
    await db.routineLogs.where('routineId').equals(id).delete()
    await db.routines.delete(id)
    await log(r, 'deleted', 'excluiu a rotina e suas execuções')
  })
}

async function getLog(routineId: ID, date: ISODate) {
  return db.routineLogs.where('[routineId+date]').equals([routineId, date]).first()
}

function freshLog(routine: Routine, date: ISODate): RoutineLog {
  return {
    id: uid(),
    routineId: routine.id,
    date,
    steps: routine.steps.map((s) => ({ id: s.id, title: s.title, done: false })),
    status: 'partial',
    note: '',
    completedAt: null,
    updatedAt: Date.now(),
  }
}

async function saveLog(routine: Routine, entry: RoutineLog, wasDone: boolean) {
  const allDone = entry.steps.length > 0 && entry.steps.every((s) => s.done)
  const now = Date.now()
  entry.status = allDone ? 'done' : 'partial'
  entry.completedAt = allDone ? (entry.completedAt ?? now) : null
  entry.updatedAt = now
  const anyDone = entry.steps.some((s) => s.done)
  if (!anyDone && !entry.note) await db.routineLogs.delete(entry.id)
  else await db.routineLogs.put(entry)
  const when = entry.date === todayISO() ? 'hoje' : `em ${formatShortDate(entry.date)}`
  if (allDone && !wasDone) await log(routine, 'completed', `concluiu a execução ${when}`)
  if (!allDone && wasDone) await log(routine, 'reopened', `desfez a conclusão ${when}`)
}

/** Marca/desmarca uma etapa da execução do dia. */
export async function toggleRoutineStep(routineId: ID, date: ISODate, stepId: ID) {
  await db.transaction('rw', TX, async () => {
    const routine = await db.routines.get(routineId)
    if (!routine) return
    const entry = (await getLog(routineId, date)) ?? freshLog(routine, date)
    const wasDone = entry.status === 'done'
    // etapas novas da rotina passam a aparecer em execuções ainda abertas
    if (!wasDone) {
      for (const s of routine.steps) {
        if (!entry.steps.some((x) => x.id === s.id)) entry.steps.push({ id: s.id, title: s.title, done: false })
      }
    }
    entry.steps = entry.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s))
    await saveLog(routine, entry, wasDone)
  })
}

/** Conclui (ou desfaz) a execução inteira do dia. Rotinas sem etapas usam uma etapa implícita. */
export async function setRoutineDone(routineId: ID, date: ISODate, done: boolean) {
  await db.transaction('rw', TX, async () => {
    const routine = await db.routines.get(routineId)
    if (!routine) return
    const entry = (await getLog(routineId, date)) ?? freshLog(routine, date)
    const wasDone = entry.status === 'done'
    if (entry.steps.length === 0) entry.steps = [{ id: 'execucao', title: 'Execução', done }]
    entry.steps = entry.steps.map((s) => ({ ...s, done }))
    await saveLog(routine, entry, wasDone)
  })
}

export async function setRoutineNote(routineId: ID, date: ISODate, note: string) {
  await db.transaction('rw', TX, async () => {
    const routine = await db.routines.get(routineId)
    if (!routine) return
    const entry = (await getLog(routineId, date)) ?? freshLog(routine, date)
    entry.note = note
    entry.updatedAt = Date.now()
    if (!note && !entry.steps.some((s) => s.done)) await db.routineLogs.delete(entry.id)
    else await db.routineLogs.put(entry)
  })
}
