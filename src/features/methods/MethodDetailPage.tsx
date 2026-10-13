import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, Copy, GitBranch, MoreHorizontal, Pencil, Play } from 'lucide-react'
import { useEntityActivity, useMethods, useRuns } from '../../db/hooks'
import { deleteMethod, duplicateMethod, runProgress, startRun, updateMethod } from '../../db/methods'
import { formatDateTime, formatShortDate, isoFromTimestamp } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { runStatusLabel } from '../../lib/meta'
import { Markdown } from '../../components/Markdown'
import { Menu } from '../../components/Menu'
import { useConfirm, useToast } from '../../components/feedback'
import { Timeline } from '../../components/Timeline'
import { Button, PageHeader, Panel, ProgressBar, cx } from '../../components/ui'
import { NotFound } from '../shell/NotFound'
import { MethodForm } from './MethodForm'

export function MethodDetailPage() {
  const { number } = useParams()
  const methods = useMethods()
  const runs = useRuns() ?? []
  const method = methods?.find((m) => String(m.number) === number)
  const history = useEntityActivity(method?.id)
  const [editing, setEditing] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const categories = useMemo(() => [...new Set((methods ?? []).map((m) => m.category).filter(Boolean))].sort(), [methods])

  if (!methods) return null
  if (!method) return <NotFound what="Método" />

  const key = entityKey('method', method.number)
  const mine = runs.filter((r) => r.methodId === method.id)
  const source = method.duplicatedFrom ? methods.find((m) => m.id === method.duplicatedFrom) : undefined
  const totalItems = method.steps.reduce((n, s) => n + s.checklist.length, 0)

  const start = async () => {
    const run = await startRun(method.id)
    if (run) {
      toast(`${entityKey('run', run.number)} iniciada a partir da v${method.version}`)
      navigate(`/metodos/execucoes/${run.number}`)
    }
  }

  return (
    <div className="page">
      <PageHeader
        section={`métodos / ${key}`}
        title={
          <>
            {method.title}
            <span className="version mono">v{method.version}</span>
            {method.archived && <span className="pill pill--paused">Arquivado</span>}
          </>
        }
        description={
          <>
            {method.category && <span className="pill pill--neutral">{method.category}</span>} {method.summary}
            {source && (
              <span className="muted">
                {' '}
                · duplicado de <Link to={`/metodos/${source.number}`}>{entityKey('method', source.number)}</Link>
              </span>
            )}
          </>
        }
        actions={
          <>
            <Button variant="primary" icon={Play} onClick={start} disabled={method.archived}>
              Iniciar execução
            </Button>
            <Button icon={Pencil} onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Menu
              label="Mais ações"
              align="end"
              triggerClassName="btn btn--ghost btn--md btn--icon"
              trigger={<MoreHorizontal size={16} aria-hidden />}
              items={[
                {
                  id: 'dup',
                  label: 'Duplicar método',
                  icon: <Copy size={14} aria-hidden />,
                  onSelect: async () => {
                    const c = await duplicateMethod(method.id)
                    if (c) {
                      toast(`Duplicado como ${entityKey('method', c.number)}`)
                      navigate(`/metodos/${c.number}`)
                    }
                  },
                },
                {
                  id: 'arch',
                  label: method.archived ? 'Restaurar' : 'Arquivar',
                  icon: method.archived ? <ArchiveRestore size={14} aria-hidden /> : <Archive size={14} aria-hidden />,
                  onSelect: () => updateMethod(method.id, { archived: !method.archived }),
                },
                {
                  id: 'del',
                  label: 'Excluir método',
                  danger: true,
                  onSelect: async () => {
                    const ok = await confirm({
                      title: `Excluir ${key}?`,
                      message: `As ${mine.length} execuções já realizadas continuam disponíveis, pois são cópias independentes.`,
                      confirmLabel: 'Excluir método',
                      danger: true,
                    })
                    if (!ok) return
                    await deleteMethod(method.id)
                    navigate('/metodos')
                  },
                },
              ]}
            />
          </>
        }
      />

      <div className="split">
        <div className="split__main">
          {method.documentation.trim() && (
            <Panel title="Documentação">
              <Markdown source={method.documentation} />
            </Panel>
          )}
          <Panel title="Procedimento" count={method.steps.length} actions={<span className="mono muted">{totalItems} itens de checklist</span>}>
            {method.steps.length === 0 ? (
              <p className="muted">Nenhuma etapa definida. Edite o método para adicionar etapas e checklists.</p>
            ) : (
              <ol className="procedure">
                {method.steps.map((s, i) => (
                  <li key={s.id} className="procedure__step">
                    <span className="procedure__n mono">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{s.title}</h3>
                      {s.description && <p className="muted">{s.description}</p>}
                      {s.checklist.length > 0 && (
                        <ul className="procedure__checklist">
                          {s.checklist.map((c) => (
                            <li key={c.id}>
                              <span className="md-box" aria-hidden />
                              {c.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
        <aside className="split__side">
          <Panel title="Execuções" count={mine.length}>
            {mine.length === 0 ? (
              <p className="muted">Nenhuma execução ainda. Cada execução copia as etapas desta versão e registra o progresso separadamente.</p>
            ) : (
              <ul className="run-list">
                {mine.map((r) => {
                  const p = runProgress(r)
                  return (
                    <li key={r.id}>
                      <Link to={`/metodos/execucoes/${r.number}`} className="run-list__item">
                        <span className="run-list__top">
                          <span className="ref mono">{entityKey('run', r.number)}</span>
                          <span className={cx('pill', `pill--run-${r.status}`)}>{runStatusLabel(r.status)}</span>
                          <span
                            className={cx('version mono', r.methodVersion !== method.version && 'is-old')}
                            title={r.methodVersion !== method.version ? 'Versão anterior do método' : 'Versão atual'}
                          >
                            <GitBranch size={11} aria-hidden /> v{r.methodVersion}
                          </span>
                        </span>
                        <span className="run-list__title">{r.title}</span>
                        <span className="run-list__progress">
                          <ProgressBar value={p.done} total={p.total} />
                          <span className="mono muted">{formatShortDate(isoFromTimestamp(r.completedAt ?? r.startedAt))}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
          <Panel title="Versões e alterações">
            <p className="muted small">Atualizado em {formatDateTime(method.updatedAt)}</p>
            <Timeline items={history} />
          </Panel>
        </aside>
      </div>
      <MethodForm open={editing} method={method} onClose={() => setEditing(false)} categories={categories} />
    </div>
  )
}
