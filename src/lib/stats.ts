import type { ISODate, MethodRun, Post, Routine, RoutineLog, Task } from '../db/types'
import { addDays, isoFromTimestamp } from './dates'
import { isScheduled, scheduledDates } from './recurrence'

export interface RoutineStats {
  /** Sequência atual de ocorrências previstas concluídas. */
  streak: number
  /** Maior sequência já registrada. */
  best: number
  /** Concluídas ÷ previstas nos últimos 30 dias (0–1), ou null sem ocorrências. */
  rate: number | null
  scheduled30: number
  done30: number
  totalDone: number
  scheduledToday: boolean
  doneToday: boolean
}

export function routineStats(routine: Routine, logs: RoutineLog[], today: ISODate): RoutineStats {
  const done = new Set(logs.filter((l) => l.routineId === routine.id && l.status === 'done').map((l) => l.date))
  const all = scheduledDates(routine, routine.startDate, today)
  const scheduledToday = isScheduled(routine, today)
  const doneToday = done.has(today)

  // Hoje ainda pendente não quebra a sequência.
  let streak = 0
  for (let i = all.length - 1; i >= 0; i--) {
    const d = all[i]
    if (d === today && !doneToday) continue
    if (done.has(d)) streak++
    else break
  }

  let best = 0
  let run = 0
  for (const d of all) {
    if (done.has(d)) {
      run++
      best = Math.max(best, run)
    } else if (d !== today) {
      run = 0
    }
  }

  const from = addDays(today, -29)
  const window = all.filter((d) => d >= from && (d !== today || doneToday))
  const done30 = window.filter((d) => done.has(d)).length

  return {
    streak,
    best,
    rate: window.length ? done30 / window.length : null,
    scheduled30: window.length,
    done30,
    totalDone: done.size,
    scheduledToday,
    doneToday,
  }
}

/* ------------------------------------------------- gráfico de consistência */

export interface DayContribution {
  total: number
  tasks: number
  routines: number
  runs: number
  posts: number
}

export const emptyDay = (): DayContribution => ({ total: 0, tasks: 0, routines: 0, runs: 0, posts: 0 })

/** Conta entregas por dia: tarefas concluídas, rotinas cumpridas,
 *  execuções de métodos finalizadas e publicações realizadas. */
export function contributionMap(input: {
  tasks: Task[]
  logs: RoutineLog[]
  runs: MethodRun[]
  posts: Post[]
}): Map<ISODate, DayContribution> {
  const map = new Map<ISODate, DayContribution>()
  const bump = (day: ISODate, key: Exclude<keyof DayContribution, 'total'>) => {
    let d = map.get(day)
    if (!d) {
      d = emptyDay()
      map.set(day, d)
    }
    d[key]++
    d.total++
  }
  for (const t of input.tasks) if (t.status === 'done' && t.completedAt) bump(isoFromTimestamp(t.completedAt), 'tasks')
  for (const l of input.logs) if (l.status === 'done') bump(l.date, 'routines')
  for (const r of input.runs) if (r.status === 'completed' && r.completedAt) bump(isoFromTimestamp(r.completedAt), 'runs')
  for (const p of input.posts) if (p.status === 'published' && p.publishedAt) bump(isoFromTimestamp(p.publishedAt), 'posts')
  return map
}

/** Nível de intensidade 0–4, relativo ao maior dia do período. */
export function intensity(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  const q = count / max
  if (q <= 0.25) return 1
  if (q <= 0.5) return 2
  if (q <= 0.75) return 3
  return 4
}

/** Dias seguidos com ao menos uma entrega. Se hoje estiver vazio, conta até ontem. */
export function currentDayStreak(map: Map<ISODate, DayContribution>, today: ISODate): number {
  let d = (map.get(today)?.total ?? 0) > 0 ? today : addDays(today, -1)
  let n = 0
  while ((map.get(d)?.total ?? 0) > 0) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function longestDayStreak(map: Map<ISODate, DayContribution>, from: ISODate, to: ISODate): number {
  let best = 0
  let run = 0
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if ((map.get(d)?.total ?? 0) > 0) {
      run++
      best = Math.max(best, run)
    } else run = 0
  }
  return best
}
