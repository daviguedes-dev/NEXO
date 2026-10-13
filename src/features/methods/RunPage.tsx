import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCheck, CircleSlash, GitBranch, RotateCcw, Trash2 } from 'lucide-react'
import { useEntityActivity, useMethods, useRuns } from '../../db/hooks'
import { deleteRun, runProgress, setRunStatus, toggleRunItem, updateRun } from '../../db/methods'
import { formatDateTime } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { runStatusLabel } from '../../lib/meta'
import { useConfirm, useToast } from '../../components/feedback'
import { Timeline } from '../../components/Timeline'
import { Button, Checkbox, PageHeader, Panel, ProgressRing, TextArea, cx } from '../../components/ui'
import { NotFound } from '../shell/NotFound'

export function RunPage() {
  const { number } = useParams()
  const runs = useRuns()
  const methods = useMethods() ?? []
  const run = runs?.find((r) => String(r.number) === number)
  const history = useEntityActivity(run?.id)
  const [notes, setNotes] = useState('')
  const [title, setTitle] = useState('')
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    setNotes(run?.notes ?? '')
    setTitle(run?.title ?? '')
  }, [run?.id, run?.notes, run?.title])

  if (!runs) return null
  if (!run) return <NotFound what="Execução" />

  const method = methods.find((m) => m.id === run.methodId)
  const p = runProgress(run)
  const key = entityKey('run', run.number)
  const editable = run.status === 'active'

  return (
    <div className="page">
      <PageHeader
        section={`métodos / execuções / ${key}`}
        title={
          <input
            className="title-input"
            value={title}
            aria-label="Título da execução"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== run.title && updateRun(run.id, { title: title.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        }
        description={
          <span className="run-origin">
            <span className={cx('pill', `pill--run-${run.status}`)}>{runStatusLabel(run.status)}</span>
            <GitBranch size={14} aria-hidden />
            baseada em{' '}
            {method ? (
              <Link to={`/metodos/${method.number}`}>
                {entityKey('method', method.number)} · {run.methodTitle}
              </Link>
            ) : (
              <span>{run.methodTitle} (método excluído)</span>
            )}{' '}
            <span className="version mono">v{run.methodVersion}</span>
            {method && method.version !== run.methodVersion && <span className="muted">· o método já está na v{method.version}; esta execução segue a versão em que foi iniciada</span>}
          </span>
        }
        actions={
          <>
            {run.status === 'active' ? (
              <>
                <Button variant="primary" icon={CheckCheck} onClick={() => setRunStatus(run.id, 'completed').then(() => toast(`${key} concluída`))}>
                  Concluir execução
                </Button>
                <Button icon={CircleSlash} onClick={() => setRunStatus(run.id, 'canceled')}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button icon={RotateCcw} onClick={() => setRunStatus(run.id, 'active')}>
                Reabrir
              </Button>
            )}
            <Button
              variant="ghost"
              iconOnly
              icon={Trash2}
              aria-label="Excluir execução"
              onClick={async () => {
                if (!(await confirm({ title: `Excluir ${key}?`, message: 'O método original não é afetado.', confirmLabel: 'Excluir', danger: true }))) return
                await deleteRun(run.id)
                navigate(method ? `/metodos/${method.number}` : '/metodos')
              }}
            />
          </>
        }
      />

      <div className="split">
        <div className="split__main">
          <Panel
            title="Checklist"
            actions={
              <ProgressRing value={p.done} total={p.total} size={40}>
                <span className="mono">{p.total ? Math.round((p.done / p.total) * 100) : 0}%</span>
              </ProgressRing>
            }
          >
            {!editable && <p className="day-panel__note">Execução {runStatusLabel(run.status).toLowerCase()}. Reabra para alterar o checklist.</p>}
            <ol className="procedure procedure--run">
              {run.steps.map((s, i) => {
                const done = s.checklist.filter((c) => c.done).length
                const complete = s.checklist.length > 0 && done === s.checklist.length
                return (
                  <li key={s.id} className={cx('procedure__step', complete && 'is-complete')}>
                    <span className="procedure__n mono">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>
                        {s.title}
                        {s.checklist.length > 0 && (
                          <span className="count mono">
                            {done}/{s.checklist.length}
                          </span>
                        )}
                      </h3>
                      {s.description && <p className="muted">{s.description}</p>}
                      <ul className="run-checklist">
                        {s.checklist.map((c) => (
                          <li key={c.id}>
                            <Checkbox checked={c.done} disabled={!editable} onChange={() => toggleRunItem(run.id, s.id, c.id)} label={c.text} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Panel>
        </div>
        <aside className="split__side">
          <Panel title="Anotações da execução">
            <TextArea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== run.notes && updateRun(run.id, { notes })} placeholder="Decisões, valores, problemas encontrados…" aria-label="Anotações" />
            <p className="field__hint">Ficam só nesta execução; o método original não muda.</p>
          </Panel>
          <Panel title="Registro">
            <dl className="kv">
              <dt>Iniciada</dt>
              <dd>{formatDateTime(run.startedAt)}</dd>
              {run.completedAt && (
                <>
                  <dt>Concluída</dt>
                  <dd>{formatDateTime(run.completedAt)}</dd>
                </>
              )}
            </dl>
            <Timeline items={history} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
