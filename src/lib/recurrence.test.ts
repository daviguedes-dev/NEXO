import { describe, expect, it } from 'vitest'
import { describeFrequency, isScheduled, nextOccurrence, scheduledDates } from './recurrence'

describe('recorrência de rotinas', () => {
  it('diária começa na data de início', () => {
    const r = { frequency: { kind: 'daily' as const }, startDate: '2026-10-10' }
    expect(isScheduled(r, '2026-10-09')).toBe(false)
    expect(isScheduled(r, '2026-10-10')).toBe(true)
    expect(scheduledDates(r, '2026-10-01', '2026-10-12')).toEqual(['2026-10-10', '2026-10-11', '2026-10-12'])
  })

  it('semanal respeita os dias escolhidos (0 = domingo)', () => {
    // 2026-10-12 é segunda-feira
    const r = { frequency: { kind: 'weekly' as const, days: [1, 3, 5] }, startDate: '2026-01-01' }
    expect(scheduledDates(r, '2026-10-12', '2026-10-18')).toEqual(['2026-10-12', '2026-10-14', '2026-10-16'])
    expect(describeFrequency(r.frequency)).toBe('Seg, Qua, Sex')
    expect(describeFrequency({ kind: 'weekly', days: [5, 4, 3, 2, 1] })).toBe('Dias úteis')
  })

  it('intervalo conta a partir do início, atravessando meses', () => {
    const r = { frequency: { kind: 'interval' as const, every: 3 }, startDate: '2026-10-30' }
    expect(scheduledDates(r, '2026-10-28', '2026-11-06')).toEqual(['2026-10-30', '2026-11-02', '2026-11-05'])
    expect(nextOccurrence(r, '2026-11-03')).toBe('2026-11-05')
  })
})
