import type { ISODate, Routine, RoutineFrequency } from '../db/types'
import { WEEKDAYS_SHORT, addDays, diffDays, weekday } from './dates'

type Schedulable = Pick<Routine, 'frequency' | 'startDate'>

/** A rotina está prevista para este dia? */
export function isScheduled(routine: Schedulable, date: ISODate): boolean {
  if (date < routine.startDate) return false
  const f = routine.frequency
  switch (f.kind) {
    case 'daily':
      return true
    case 'weekly':
      return f.days.includes(weekday(date))
    case 'interval':
      return diffDays(routine.startDate, date) % Math.max(1, f.every) === 0
  }
}

/** Datas previstas entre `from` e `to` (inclusive), em ordem crescente. */
export function scheduledDates(routine: Schedulable, from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  let d = from < routine.startDate ? routine.startDate : from
  while (d <= to) {
    if (isScheduled(routine, d)) out.push(d)
    d = addDays(d, 1)
  }
  return out
}

/** Próxima data prevista a partir de `from` (inclusive), ou null. */
export function nextOccurrence(routine: Schedulable, from: ISODate, horizon = 400): ISODate | null {
  let d = from < routine.startDate ? routine.startDate : from
  for (let i = 0; i < horizon; i++) {
    if (isScheduled(routine, d)) return d
    d = addDays(d, 1)
  }
  return null
}

export function describeFrequency(f: RoutineFrequency): string {
  switch (f.kind) {
    case 'daily':
      return 'Todos os dias'
    case 'interval':
      return f.every === 1 ? 'Todos os dias' : `A cada ${f.every} dias`
    case 'weekly': {
      const days = [...f.days].sort()
      const key = days.join(',')
      if (key === '1,2,3,4,5') return 'Dias úteis'
      if (key === '0,6') return 'Fins de semana'
      if (days.length === 7) return 'Todos os dias'
      if (days.length === 0) return 'Nenhum dia definido'
      // segunda primeiro, domingo por último
      const ordered = [...days.filter((d) => d !== 0), ...days.filter((d) => d === 0)]
      return ordered.map((d) => WEEKDAYS_SHORT[d]).join(', ')
    }
  }
}
