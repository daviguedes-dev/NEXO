import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Archive, ChevronLeft, ChevronRight, Plus, Repeat2 } from 'lucide-react'
import type { ISODate } from '../../db/types'
import { useRoutineLogs, useRoutines } from '../../db/hooks'
import { WEEKDAYS_SHORT, addDays, formatLongDate, todayISO, weekday } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { describeFrequency, isScheduled } from '../../lib/recurrence'
import { routineStats } from '../../lib/stats'
import { Button, EmptyState, PageHeader, Panel, ProgressBar, ProgressRing, cx } from '../../components/ui'
import { RoutineCheck } from './RoutineCheck'
import { RoutineForm } from './RoutineForm'

export function RoutinesPage() {
  const routines = useRoutines()
  const logs = useRoutineLogs() ?? []
  const [sp, setSp] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const today = todayISO()
  const [day, setDay] = useState<ISODate>(today)

  useEffect(() => {
    if (sp.get('nova') === '1') {
      setCreating(true)
      setSp({}, { replace: true })
    }
  }, [sp, setSp])

  const active = useMemo(() => (routines ?? []).filter((r) => !r.archived), [routines])
  const archived = (routines ?? []).filter((r) => r.archived)
  const dayList = active
    .filter((r) => isScheduled(r, day))
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  const dayLogs = new Map(logs.filter((l) => l.date === day).map((l) => [l.routineId, l]))
  const dayDone = dayList.filter((r) => dayLogs.get(r.id)?.status === 'done').length
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const doneSet = new Set(logs.filter((l) => l.status === 'done').map((l) => `${l.routineId}|${l.date}`))

  return (
    <div className="page">
      <PageHeader
        section="rotinas"
        title="Rotinas"
        description="Hábitos e procedimentos recorrentes, com histórico completo de execuções."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            Nova rotina
          </Button>
        }
      />

      {routines && routines.length === 0 ? (
        <EmptyState icon={Repeat2} title="Nenhuma rotina configurada" action={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Criar rotina</Button>}>
          Defina rotinas diárias, semanais ou a cada N dias, com horário e etapas. Cada execução fica registrada e alimenta o mapa de consistência.
        </EmptyState>
      ) : (
        <div className="routines-layout">
          <Panel
            className="day-panel"
            title={
              <span className="day-nav">
                <Button variant="ghost" size="sm" iconOnly icon={ChevronLeft} aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))} />
                <span className="day-nav__label">
                  {day === today ? 'Hoje' : formatLongDate(day)}
                  {day === today && <span className="muted"> · {formatLongDate(day)}</span>}
                </span>
                <Button variant="ghost" size="sm" iconOnly icon={ChevronRight} aria-label="Próximo dia" disabled={day >= today} onClick={() => setDay(addDays(day, 1))} />
              </span>
            }
            actions={
              dayList.length > 0 && (
                <ProgressRing value={dayDone} total={dayList.length} size={38}>
                  <span className="mono">
                    {dayDone}/{dayList.length}
                  </span>
                </ProgressRing>
              )
            }
          >
            {day !== today && (
              <p className="day-panel__note">
                Registrando execuções de um dia anterior. <button className="link" onClick={() => setDay(today)}>Voltar para hoje</button>
              </p>
            )}
            {dayList.length === 0 ? (
              <p className="muted day-panel__empty">Nenhuma rotina prevista para este dia.</p>
            ) : (
              <div className="rcheck-list">
                {dayList.map((r) => (
                  <RoutineCheck key={r.id} routine={r} log={dayLogs.get(r.id)} date={day} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Todas as rotinas" count={active.length} className="routine-table-panel">
            <div className="table-scroll">
              <table className="table routine-table">
                <thead>
                  <tr>
                    <th scope="col">Rotina</th>
                    <th scope="col">Frequência</th>
                    <th scope="col" className="num">
                      Sequência
                    </th>
                    <th scope="col">30 dias</th>
                    <th scope="col">
                      <span className="sr-only">Últimos 14 dias</span>
                      <span aria-hidden>14 dias</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((r) => {
                    const s = routineStats(r, logs, today)
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link to={`/rotinas/${r.number}`} className="table__title">
                            {r.name}
                          </Link>
                          <span className="ref mono">
                            {entityKey('routine', r.number)}
                            {r.time && ` · ${r.time}`}
                            {` · ${r.steps.length || 1} etapa${r.steps.length > 1 ? 's' : ''}`}
                          </span>
                        </td>
                        <td className="muted">{describeFrequency(r.frequency)}</td>
                        <td className="num mono">
                          {s.streak}
                          <span className="muted"> / {s.best}</span>
                        </td>
                        <td>
                          {s.rate === null ? (
                            <span className="muted">—</span>
                          ) : (
                            <span className="rate">
                              <ProgressBar value={s.done30} total={s.scheduled30} label={`${Math.round(s.rate * 100)}% nos últimos 30 dias`} />
                              <span className="mono">{Math.round(s.rate * 100)}%</span>
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="dots" aria-label={`Últimos 14 dias de ${r.name}`}>
                            {last14.map((d) => {
                              const sched = isScheduled(r, d)
                              const ok = doneSet.has(`${r.id}|${d}`)
                              return (
                                <span
                                  key={d}
                                  className={cx('dot-day', ok && 'is-done', sched && !ok && d < today && 'is-missed', !sched && 'is-off', d === today && 'is-today')}
                                  title={`${WEEKDAYS_SHORT[weekday(d)]} ${d.slice(8)}/${d.slice(5, 7)}: ${ok ? 'concluída' : sched ? (d === today ? 'pendente' : 'não realizada') : 'não prevista'}`}
                                />
                              )
                            })}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {archived.length > 0 && (
              <div className="archived">
                <Button variant="ghost" size="sm" icon={Archive} onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived}>
                  {showArchived ? 'Ocultar' : 'Mostrar'} arquivadas ({archived.length})
                </Button>
                {showArchived && (
                  <ul className="archived__list">
                    {archived.map((r) => (
                      <li key={r.id}>
                        <Link to={`/rotinas/${r.number}`}>{r.name}</Link>
                        <span className="ref mono">{entityKey('routine', r.number)}</span>
                        <span className="muted">histórico preservado</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Panel>
        </div>
      )}
      <RoutineForm open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
