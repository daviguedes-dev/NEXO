import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { ISODate, Post } from '../../db/types'
import { WEEKDAYS_SHORT, addDays, formatMonth, isoFromTimestamp, startOfWeek, todayISO, toISODate } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { postStatusLabel } from '../../lib/meta'
import { Button, cx } from '../../components/ui'

/** Calendário mensal: publicadas na data real, demais na data prevista. */
export function PostCalendar({ posts, onCreate }: { posts: Post[]; onCreate: (date: ISODate) => void }) {
  const today = todayISO()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const first = toISODate(new Date(cursor.y, cursor.m, 1))
  const gridStart = startOfWeek(first)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const visibleDays = days[35].slice(5, 7) === String(cursor.m + 1).padStart(2, '0') ? days : days.slice(0, 35)

  const byDay = new Map<ISODate, Post[]>()
  for (const p of posts) {
    const d = p.status === 'published' && p.publishedAt ? isoFromTimestamp(p.publishedAt) : p.scheduledDate
    if (!d) continue
    byDay.set(d, [...(byDay.get(d) ?? []), p])
  }
  const unscheduled = posts.filter((p) => p.status !== 'published' && !p.scheduledDate)

  const shift = (n: number) => setCursor(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }))

  return (
    <div className="calendar-wrap">
      <div className="calendar panel">
        <header className="calendar__head">
          <h2 className="calendar__title">{formatMonth(cursor.y, cursor.m)}</h2>
          <div className="calendar__nav">
            <Button size="sm" variant="ghost" iconOnly icon={ChevronLeft} aria-label="Mês anterior" onClick={() => shift(-1)} />
            <Button
              size="sm"
              onClick={() => {
                const d = new Date()
                setCursor({ y: d.getFullYear(), m: d.getMonth() })
              }}
            >
              Hoje
            </Button>
            <Button size="sm" variant="ghost" iconOnly icon={ChevronRight} aria-label="Próximo mês" onClick={() => shift(1)} />
          </div>
        </header>
        <div className="calendar__grid" role="grid" aria-label={formatMonth(cursor.y, cursor.m)}>
          <div className="calendar__row calendar__row--head" role="row">
            {WEEKDAYS_SHORT.map((w) => (
              <span key={w} role="columnheader" className="calendar__wd">
                {w}
              </span>
            ))}
          </div>
          {Array.from({ length: visibleDays.length / 7 }, (_, w) => (
            <div key={w} className="calendar__row" role="row">
              {visibleDays.slice(w * 7, w * 7 + 7).map((d) => {
                const inMonth = Number(d.slice(5, 7)) === cursor.m + 1
                const items = byDay.get(d) ?? []
                return (
                  <div key={d} role="gridcell" className={cx('calendar__day', !inMonth && 'is-out', d === today && 'is-today')}>
                    <div className="calendar__day-head">
                      <span className="calendar__num mono">{Number(d.slice(8))}</span>
                      <button type="button" className="calendar__add" aria-label={`Nova publicação em ${d.split('-').reverse().join('/')}`} onClick={() => onCreate(d)}>
                        <Plus size={13} aria-hidden />
                      </button>
                    </div>
                    <ul className="calendar__items">
                      {items.map((p) => (
                        <li key={p.id}>
                          <Link to={`/publicacoes/${p.number}`} className={cx('cal-item', `cal-item--${p.status}`)} title={`${entityKey('post', p.number)} · ${postStatusLabel(p.status)}`}>
                            {p.scheduledTime && p.status !== 'published' && <span className="mono">{p.scheduledTime}</span>}
                            <span className="cal-item__title">{p.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <aside className="calendar-side panel">
        <h3 className="panel__title">
          Sem data <span className="count mono">{unscheduled.length}</span>
        </h3>
        {unscheduled.length === 0 ? (
          <p className="muted small">Tudo o que está em produção tem data prevista.</p>
        ) : (
          <ul className="plain-list">
            {unscheduled.map((p) => (
              <li key={p.id}>
                <Link to={`/publicacoes/${p.number}`}>{p.title}</Link>
                <span className="muted small">{postStatusLabel(p.status)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="legend">
          {(['idea', 'production', 'review', 'scheduled', 'published'] as const).map((s) => (
            <span key={s} className="legend__item">
              <span className={cx('stage-dot', `stage-dot--${s}`)} aria-hidden /> {postStatusLabel(s)}
            </span>
          ))}
        </div>
      </aside>
    </div>
  )
}
