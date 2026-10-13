import { describe, expect, it } from 'vitest'
import type { Routine, RoutineLog } from '../db/types'
import { contributionMap, currentDayStreak, intensity, routineStats } from './stats'

const routine: Routine = {
  id: 'r1',
  number: 1,
  name: 'Teste',
  description: '',
  frequency: { kind: 'daily' },
  time: null,
  priority: 'medium',
  steps: [],
  startDate: '2026-10-01',
  archived: false,
  createdAt: 0,
  updatedAt: 0,
}
const done = (date: string): RoutineLog => ({ id: date, routineId: 'r1', date, steps: [], status: 'done', note: '', completedAt: 1, updatedAt: 1 })

describe('estatísticas de rotina', () => {
  it('hoje pendente não quebra a sequência', () => {
    const logs = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'].map(done)
    const s = routineStats(routine, logs, '2026-10-13')
    expect(s.streak).toBe(5)
    expect(s.doneToday).toBe(false)
  })

  it('um dia perdido zera a sequência atual, mas mantém a melhor', () => {
    const logs = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-06'].map(done)
    const s = routineStats(routine, logs, '2026-10-06')
    expect(s.streak).toBe(1)
    expect(s.best).toBe(4)
    expect(s.rate).toBeCloseTo(5 / 6)
  })
})

describe('gráfico de consistência', () => {
  it('soma entregas de todos os módulos por dia', () => {
    const map = contributionMap({
      tasks: [{ status: 'done', completedAt: new Date(2026, 9, 12, 15).getTime() } as never],
      logs: [done('2026-10-12'), done('2026-10-11')],
      runs: [],
      posts: [{ status: 'published', publishedAt: new Date(2026, 9, 12, 9).getTime() } as never],
    })
    expect(map.get('2026-10-12')).toMatchObject({ total: 3, tasks: 1, routines: 1, posts: 1 })
    expect(currentDayStreak(map, '2026-10-13')).toBe(2)
  })

  it('intensidade é relativa ao maior dia', () => {
    expect(intensity(0, 8)).toBe(0)
    expect(intensity(1, 8)).toBe(1)
    expect(intensity(8, 8)).toBe(4)
  })
})
