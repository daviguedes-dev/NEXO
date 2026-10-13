import type { ISODate, Timestamp } from '../db/types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Converte AAAA-MM-DD em Date à meia-noite local. */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Número de dias de `a` até `b` (b − a), ignorando horário de verão. */
export function diffDays(a: ISODate, b: ISODate): number {
  const ua = Date.UTC(...ymd(a))
  const ub = Date.UTC(...ymd(b))
  return Math.round((ub - ua) / 86_400_000)
}

function ymd(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y, m - 1, d]
}

/** 0 = domingo … 6 = sábado */
export function weekday(iso: ISODate): number {
  return parseISODate(iso).getDay()
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekday(iso))
}

export function isoFromTimestamp(ts: Timestamp): ISODate {
  return toISODate(new Date(ts))
}

/* ----------------------------------------------------------- formatação */

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function fmt(opts: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(opts)
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat('pt-BR', opts)
    fmtCache.set(key, f)
  }
  return f
}

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

/** "13 out" ou "13 out 2025" quando for de outro ano. */
export function formatShortDate(iso: ISODate, now = new Date()): string {
  const d = parseISODate(iso)
  const sameYear = d.getFullYear() === now.getFullYear()
  return fmt(sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
    .format(d)
    .replace('.', '')
}

export function formatLongDate(iso: ISODate): string {
  return fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(parseISODate(iso))
}

export function formatFullDate(iso: ISODate): string {
  return fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(parseISODate(iso))
}

export function formatMonth(year: number, month: number): string {
  const s = fmt({ month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatDateTime(ts: Timestamp): string {
  return fmt({ day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts)).replace('.', '')
}

export function formatTime(ts: Timestamp): string {
  return fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
}

/** "hoje", "amanhã", "ontem", "em 3 dias", "há 2 dias", ou a data curta. */
export function relativeDay(iso: ISODate, today: ISODate = todayISO()): string {
  const d = diffDays(today, iso)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'ontem'
  if (d > 1 && d <= 6) return `em ${d} dias`
  if (d < -1 && d >= -6) return `há ${-d} dias`
  return formatShortDate(iso)
}

/** "agora", "há 5 min", "há 3 h", "ontem", ou a data. */
export function timeAgo(ts: Timestamp, now: number = Date.now()): string {
  const s = Math.round((now - ts) / 1000)
  if (s < 45) return 'agora'
  const m = Math.round(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.round(m / 60)
  if (h < 24 && isoFromTimestamp(ts) === toISODate(new Date(now))) return `há ${h} h`
  return relativeDay(isoFromTimestamp(ts), toISODate(new Date(now)))
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
