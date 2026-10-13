import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, MoreHorizontal, Pencil } from 'lucide-react'
import { useEntityActivity, useRoutineLogs, useRoutines } from '../../db/hooks'
import type { ISODate } from '../../db/types'
import { deleteRoutine, setRoutineNote, updateRoutine } from '../../db/routines'
import { formatFullDate, formatLongDate, formatTime, todayISO } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { priorityLabel } from '../../lib/meta'
import { describeFrequency } from '../../lib/recurrence'
import { routineStats, type DayContribution } from '../../lib/stats'
import { ContributionGraph } from '../../components/ContributionGraph'
import { Menu } from '../../components/Menu'
import { useConfirm, useToast } from '../../components/feedback'
import { Timeline } from '../../components/Timeline'
import { Button, Input, PageHeader, Panel, cx } from '../../components/ui'
import { NotFound } from '../shell/NotFound'
import { RoutineCheck } from './RoutineCheck'
import { RoutineForm } from './RoutineForm'

export function RoutineDetailPage() {
  const { number } = useParams()
  const routines = useRoutines()
  const allLogs = useRoutineLogs()
  const routine = routines?.find((r) => String(r.number) === number)
  const history = useEntityActivity(routine?.id)
  const [editing, setEditing] = useState(false)
  const [backfill, setBackfill] = useState<ISODate>('')
  const [shown, setShown] = useState(12)
  const confirm = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()
  const today = todayISO()

  const logs = useMemo(() => (allLogs ?? []).filter((l) => l.routineId === routine?.id).sort((a, b) => b.date.localeCompare(a.date)), [allLogs, routine?.id])
  const heat = useMemo(() => {
    const m = new Map<ISODate, DayContribution>()
    for (const l of logs) if (l.status === 'done') m.set(l.date, { total: 1, routines: 1, tasks: 0, runs: 0, posts: 0 })
    return m
  }, [logs])

  if (!routines || !allLogs) return null
  if (!routine) return <NotFound what="Rotina" />

  const s = routineStats(routine, logs, today)
  const key = entityKey('routine', routine.number)
  const backfillLog = backfill ? logs.find((l) => l.date === backfill) : undefined

  return (
    <div className="page">
      <PageHeader
        section={`rotinas / ${key}`}
        title={
          <>
            {routine.name}
            {routine.archived && <span className="pill pill--paused">Arquivada</span>}
          </>
        }
        description={[describeFrequency(routine.frequency), routine.time && `às ${routine.time}`, `prioridade ${priorityLabel(routine.priority).toLowerCase()}`]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <>
            <Button icon={Pencil} onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button icon={routine.archived ? ArchiveRestore : Archive} onClick={() => updateRoutine(routine.id, { archived: !routine.archived })}>
              {routine.archived ? 'Reativar' : 'Arquivar'}
            </Button>
            <Menu
              label="Mais ações"
              align="end"
              triggerClassName="btn btn--ghost btn--md btn--icon"
              trigger={<MoreHorizontal size={16} aria-hidden />}
              items={[
                {
                  id: 'del',
                  label: 'Excluir rotina e execuções',
                  danger: true,
                  onSelect: async () => {
                    const ok = await confirm({
                      title: `Excluir ${key}?`,
                      message: (
                        <>
                          As <strong>{logs.length} execuções</strong> registradas serão apagadas. Para manter o histórico, prefira <strong>Arquivar</strong>.
                        </>
                      ),
                      confirmLabel: 'Excluir definitivamente',
                      danger: true,
                    })
                    if (!ok) return
                    await deleteRoutine(routine.id)
                    toast('Rotina excluída')
                    navigate('/rotinas')
                  },
                },
              ]}
            />
          </>
        }
      />

      <Panel title="Consistência">
        <ContributionGraph
          data={heat}
          today={today}
          fit
          unit={['execução', 'execuções']}
          breakdown={false}
          aside={
            <dl className="heat-facts">
              <div>
                <dt>Sequência atual</dt>
                <dd className="mono">{s.streak}</dd>
              </div>
              <div>
                <dt>Melhor sequência</dt>
                <dd className="mono">{s.best}</dd>
              </div>
              <div>
                <dt>Últimos 30 dias</dt>
                <dd className="mono">
                  {s.rate === null ? '—' : `${Math.round(s.rate * 100)}%`}
                  {s.rate !== null && (
                    <small>
                      {' '}
                      {s.done30}/{s.scheduled30}
                    </small>
                  )}
                </dd>
              </div>
              <div>
                <dt>Execuções registradas</dt>
                <dd className="mono">{s.totalDone}</dd>
              </div>
            </dl>
          }
        />
      </Panel>

      <div className="split">
        <div className="split__main">
          <Panel title="Execuções" count={logs.length}>
            <div className="backfill">
              <label htmlFor="backfill">Registrar ou revisar outro dia</label>
              <Input id="backfill" type="date" max={today} min={routine.startDate} value={backfill} onChange={(e) => setBackfill(e.target.value)} />
            </div>
            {backfill && (
              <div className="backfill__card">
                <p className="muted">{formatLongDate(backfill)}</p>
                <RoutineCheck routine={routine} log={backfillLog} date={backfill} />
              </div>
            )}
            {logs.length === 0 ? (
              <p className="muted">Nenhuma execução registrada ainda.</p>
            ) : (
              <ol className="log-list">
                {logs.slice(0, shown).map((l) => {
                  const done = l.steps.filter((x) => x.done).length
                  return (
                    <li key={l.id} className={cx('log', l.status === 'done' && 'is-done')}>
                      <div className="log__head">
                        <time dateTime={l.date} className="log__date">
                          {formatFullDate(l.date)}
                        </time>
                        <span className={cx('pill', l.status === 'done' ? 'pill--done' : 'pill--paused')}>{l.status === 'done' ? 'Concluída' : 'Parcial'}</span>
                        <span className="mono muted">
                          {done}/{l.steps.length} etapas{l.completedAt ? ` · ${formatTime(l.completedAt)}` : ''}
                        </span>
                      </div>
                      {l.steps.length > 1 && (
                        <ul className="log__steps">
                          {l.steps.map((st) => (
                            <li key={st.id} className={cx(st.done && 'is-done')}>
                              {st.title}
                            </li>
                          ))}
                        </ul>
                      )}
                      <input
                        className="log__note"
                        defaultValue={l.note}
                        placeholder="Adicionar observação…"
                        aria-label={`Observação de ${formatFullDate(l.date)}`}
                        onBlur={(e) => e.target.value !== l.note && setRoutineNote(routine.id, l.date, e.target.value)}
                      />
                    </li>
                  )
                })}
              </ol>
            )}
            {logs.length > shown && (
              <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + 20)}>
                Mostrar mais ({logs.length - shown} anteriores)
              </Button>
            )}
          </Panel>
        </div>
        <aside className="split__side">
          <Panel title="Etapas atuais" count={routine.steps.length}>
            {routine.description && <p className="detail-desc">{routine.description}</p>}
            {routine.steps.length ? (
              <ol className="numbered">
                {routine.steps.map((st) => (
                  <li key={st.id}>{st.title}</li>
                ))}
              </ol>
            ) : (
              <p className="muted">Sem etapas: a execução é marcada de uma vez.</p>
            )}
            <p className="field__hint">Editar as etapas não altera execuções anteriores: cada registro guarda as etapas da época.</p>
          </Panel>
          <Panel title="Histórico de alterações">
            <Timeline items={history} />
          </Panel>
        </aside>
      </div>
      <RoutineForm open={editing} routine={routine} onClose={() => setEditing(false)} />
    </div>
  )
}
