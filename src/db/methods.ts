import { db } from './database'
import { logActivity, nextNumber } from './history'
import type { ID, Method, MethodRun, MethodStep } from './types'
import { formatShortDate, todayISO } from '../lib/dates'
import { entityKey, uid } from '../lib/ids'

const TX = ['methods', 'methodRuns', 'activity', 'counters']

export type MethodInput = Partial<Omit<Method, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'version'>> & { title: string }

function logMethod(m: Method, action: string, message: string) {
  return logActivity({ type: 'method', id: m.id, number: m.number, title: m.title, action, message })
}
function logRun(r: MethodRun, action: string, message: string) {
  return logActivity({ type: 'run', id: r.id, number: r.number, title: r.title, action, message })
}

export async function createMethod(input: MethodInput): Promise<Method> {
  return db.transaction('rw', TX, async () => {
    const now = Date.now()
    const method: Method = {
      id: uid(),
      number: await nextNumber('method'),
      title: input.title.trim(),
      summary: input.summary ?? '',
      category: input.category ?? '',
      documentation: input.documentation ?? '',
      steps: input.steps ?? [],
      version: 1,
      archived: false,
      duplicatedFrom: input.duplicatedFrom ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await db.methods.add(method)
    await logMethod(method, 'created', 'criou o método (v1)')
    return method
  })
}

/** Mudanças em etapas ou documentação geram nova versão. Execuções já iniciadas não mudam. */
export async function updateMethod(id: ID, patch: Partial<Omit<Method, 'id' | 'number' | 'createdAt' | 'version'>>) {
  await db.transaction('rw', TX, async () => {
    const before = await db.methods.get(id)
    if (!before) return
    const structural =
      (patch.steps !== undefined && JSON.stringify(patch.steps) !== JSON.stringify(before.steps)) ||
      (patch.documentation !== undefined && patch.documentation !== before.documentation)
    const next: Method = { ...before, ...patch, version: before.version + (structural ? 1 : 0), updatedAt: Date.now() }
    await db.methods.put(next)
    if (patch.archived !== undefined && patch.archived !== before.archived) {
      await logMethod(next, patch.archived ? 'archived' : 'restored', patch.archived ? 'arquivou o método' : 'restaurou o método')
    } else if (structural) {
      await logMethod(next, 'version', `publicou a versão v${next.version}`)
    } else {
      await logMethod(next, 'updated', 'atualizou as informações do método')
    }
  })
}

export async function duplicateMethod(id: ID): Promise<Method | undefined> {
  const source = await db.methods.get(id)
  if (!source) return
  const copy = await createMethod({
    title: `${source.title} (cópia)`,
    summary: source.summary,
    category: source.category,
    documentation: source.documentation,
    steps: cloneSteps(source.steps),
    duplicatedFrom: source.id,
  })
  await logMethod(copy, 'duplicated', `duplicou a partir de ${entityKey('method', source.number)} v${source.version}`)
  return copy
}

/** Copia etapas com novos identificadores (cópias nunca compartilham IDs). */
export function cloneSteps(steps: MethodStep[]): MethodStep[] {
  return steps.map((s) => ({ ...s, id: uid(), checklist: s.checklist.map((c) => ({ ...c, id: uid() })) }))
}

export async function deleteMethod(id: ID) {
  await db.transaction('rw', TX, async () => {
    const m = await db.methods.get(id)
    if (!m) return
    await db.methods.delete(id)
    await logMethod(m, 'deleted', 'excluiu o método (execuções anteriores foram mantidas)')
  })
}

/* ------------------------------------------------------------ execuções */

/** Inicia uma execução: cópia profunda das etapas na versão atual. */
export async function startRun(methodId: ID, title?: string): Promise<MethodRun | undefined> {
  return db.transaction('rw', TX, async () => {
    const m = await db.methods.get(methodId)
    if (!m) return
    const now = Date.now()
    const run: MethodRun = {
      id: uid(),
      number: await nextNumber('run'),
      methodId: m.id,
      methodTitle: m.title,
      methodVersion: m.version,
      title: title?.trim() || `${m.title} · ${formatShortDate(todayISO())}`,
      steps: m.steps.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        checklist: s.checklist.map((c) => ({ id: c.id, text: c.text, done: false })),
      })),
      status: 'active',
      notes: '',
      startedAt: now,
      completedAt: null,
      updatedAt: now,
    }
    await db.methodRuns.add(run)
    await logRun(run, 'started', `iniciou a execução a partir de ${entityKey('method', m.number)} v${m.version}`)
    return run
  })
}

export async function toggleRunItem(runId: ID, stepId: ID, itemId: ID) {
  await db.transaction('rw', TX, async () => {
    const run = await db.methodRuns.get(runId)
    if (!run || run.status !== 'active') return
    const steps = run.steps.map((s) => (s.id !== stepId ? s : { ...s, checklist: s.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }))
    await db.methodRuns.update(runId, { steps, updatedAt: Date.now() })
  })
}

export async function updateRun(runId: ID, patch: Partial<Pick<MethodRun, 'title' | 'notes'>>) {
  await db.methodRuns.update(runId, { ...patch, updatedAt: Date.now() })
}

export async function setRunStatus(runId: ID, status: MethodRun['status']) {
  await db.transaction('rw', TX, async () => {
    const run = await db.methodRuns.get(runId)
    if (!run || run.status === status) return
    const now = Date.now()
    await db.methodRuns.update(runId, { status, completedAt: status === 'completed' ? now : null, updatedAt: now })
    const msg = status === 'completed' ? 'concluiu a execução' : status === 'canceled' ? 'cancelou a execução' : 'reabriu a execução'
    await logRun(run, status === 'completed' ? 'completed' : status, msg)
  })
}

export async function deleteRun(runId: ID) {
  await db.transaction('rw', TX, async () => {
    const run = await db.methodRuns.get(runId)
    if (!run) return
    await db.methodRuns.delete(runId)
    await logRun(run, 'deleted', 'excluiu a execução')
  })
}

export function runProgress(run: Pick<MethodRun, 'steps'>): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const s of run.steps)
    for (const c of s.checklist) {
      total++
      if (c.done) done++
    }
  return { done, total }
}
