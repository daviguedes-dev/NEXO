import { useMemo, useState } from 'react'
import type { ISODate } from '../db/types'
import { addDays, formatFullDate, parseISODate, startOfWeek, WEEKDAYS_SHORT } from '../lib/dates'
import { emptyDay, intensity, type DayContribution } from '../lib/stats'

interface Props {
  data: Map<ISODate, DayContribution>
  today: ISODate
  /** Quantidade de semanas exibidas (53 ≈ 1 ano). */
  weeks?: number
  /** Rótulo usado no texto de cada célula (“entregas”, “execuções”…). */
  unit?: [singular: string, plural: string]
  breakdown?: boolean
  compact?: boolean
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Mapa de consistência inspirado no gráfico de contribuições: uma coluna por semana, um quadrado por dia. */
export function ContributionGraph({ data, today, weeks = 53, unit = ['entrega', 'entregas'], breakdown = true, compact }: Props) {
  const [hover, setHover] = useState<{ date: ISODate; x: number; y: number } | null>(null)

  const { columns, max, monthLabels } = useMemo(() => {
    const first = addDays(startOfWeek(today), -(weeks - 1) * 7)
    const columns: ISODate[][] = []
    let max = 0
    const monthLabels: { col: number; label: string }[] = []
    let lastMonth = -1
    for (let w = 0; w < weeks; w++) {
      const col: ISODate[] = []
      for (let d = 0; d < 7; d++) {
        const iso = addDays(first, w * 7 + d)
        col.push(iso)
        if (iso <= today) max = Math.max(max, data.get(iso)?.total ?? 0)
      }
      const m = parseISODate(col[0]).getMonth()
      if (m !== lastMonth) {
        if (w < weeks - 2) monthLabels.push({ col: w, label: MONTHS[m] })
        lastMonth = m
      }
      columns.push(col)
    }
    return { columns, max, monthLabels }
  }, [data, today, weeks])

  const cell = compact ? 10 : 11
  const gap = compact ? 3 : 3
  const step = cell + gap
  const left = compact ? 0 : 28
  const top = 18
  const width = left + weeks * step
  const height = top + 7 * step

  const describe = (iso: ISODate) => {
    const d = data.get(iso) ?? emptyDay()
    const n = d.total
    const head = n === 0 ? `Nenhuma ${unit[0]}` : `${n} ${n === 1 ? unit[0] : unit[1]}`
    return `${head} em ${formatFullDate(iso)}`
  }

  const hovered = hover ? (data.get(hover.date) ?? emptyDay()) : null

  return (
    <div className="heat">
      <div className="heat__scroll">
        <svg className="heat__svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Mapa de consistência das últimas ${weeks} semanas`} onMouseLeave={() => setHover(null)}>
          {monthLabels.map((m) => (
            <text key={m.col} x={left + m.col * step} y={11} className="heat__month">
              {m.label}
            </text>
          ))}
          {!compact &&
            [1, 3, 5].map((d) => (
              <text key={d} x={0} y={top + d * step + cell - 2} className="heat__weekday">
                {WEEKDAYS_SHORT[d]}
              </text>
            ))}
          {columns.map((col, w) =>
            col.map((iso, d) => {
              if (iso > today) return null
              const lvl = intensity(data.get(iso)?.total ?? 0, max)
              return (
                <rect
                  key={iso}
                  x={left + w * step}
                  y={top + d * step}
                  width={cell}
                  height={cell}
                  rx={2.5}
                  className={`heat__cell heat__cell--${lvl}${iso === today ? ' is-today' : ''}`}
                  onMouseEnter={(e) => {
                    const svg = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                    const r = e.currentTarget.getBoundingClientRect()
                    setHover({ date: iso, x: r.left - svg.left + r.width / 2, y: r.top - svg.top })
                  }}
                >
                  <title>{describe(iso)}</title>
                </rect>
              )
            }),
          )}
        </svg>
        {hover && hovered && (
          <div className="heat__tip" style={{ left: hover.x, top: hover.y }} aria-hidden>
            <strong>{describe(hover.date)}</strong>
            {breakdown && hovered.total > 0 && (
              <span className="heat__tip-parts">
                {hovered.tasks > 0 && <span>{hovered.tasks} tarefa{hovered.tasks > 1 ? 's' : ''}</span>}
                {hovered.routines > 0 && <span>{hovered.routines} rotina{hovered.routines > 1 ? 's' : ''}</span>}
                {hovered.runs > 0 && <span>{hovered.runs} método{hovered.runs > 1 ? 's' : ''}</span>}
                {hovered.posts > 0 && <span>{hovered.posts} publicaç{hovered.posts > 1 ? 'ões' : 'ão'}</span>}
              </span>
            )}
          </div>
        )}
      </div>
      {!compact && (
        <div className="heat__legend" aria-hidden>
          <span>Menos</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`heat__swatch heat__cell--${l}`} />
          ))}
          <span>Mais</span>
        </div>
      )}
    </div>
  )
}
