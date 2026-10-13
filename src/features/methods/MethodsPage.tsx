import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpenCheck, Copy, Play, Plus } from 'lucide-react'
import { useMethods, useRuns } from '../../db/hooks'
import { duplicateMethod, runProgress, startRun } from '../../db/methods'
import { formatShortDate, isoFromTimestamp, timeAgo } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { useToast } from '../../components/feedback'
import { Button, EmptyState, PageHeader, Panel, ProgressBar, Segmented, cx } from '../../components/ui'
import { MethodForm } from './MethodForm'

export function MethodsPage() {
  const methods = useMethods()
  const runs = useRuns() ?? []
  const [sp, setSp] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [scope, setScope] = useState<'ativos' | 'arquivados'>('ativos')
  const [category, setCategory] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (sp.get('novo') === '1') {
      setCreating(true)
      setSp({}, { replace: true })
    }
  }, [sp, setSp])

  const categories = useMemo(() => [...new Set((methods ?? []).map((m) => m.category).filter(Boolean))].sort(), [methods])
  const list = (methods ?? [])
    .filter((m) => (scope === 'ativos' ? !m.archived : m.archived))
    .filter((m) => !category || m.category === category)
    .sort((a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR'))
  const active = runs.filter((r) => r.status === 'active')

  const start = async (id: string) => {
    const run = await startRun(id)
    if (run) {
      toast(`${entityKey('run', run.number)} iniciada`)
      navigate(`/metodos/execucoes/${run.number}`)
    }
  }

  return (
    <div className="page">
      <PageHeader
        section="métodos"
        title="Métodos de trabalho"
        description="Processos documentados com etapas e checklists. Cada execução é uma cópia independente do método."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            Novo método
          </Button>
        }
      />

      {methods && methods.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="Nenhum método documentado"
          action={
            <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
              Documentar um método
            </Button>
          }
        >
          Registre como você faz algo que se repete — um fechamento, uma revisão, um onboarding — e inicie execuções com checklist sempre que precisar.
        </EmptyState>
      ) : (
        <>
          {active.length > 0 && (
            <Panel title="Em execução" count={active.length} className="runs-panel">
              <ul className="run-cards">
                {active.map((r) => {
                  const p = runProgress(r)
                  return (
                    <li key={r.id}>
                      <Link to={`/metodos/execucoes/${r.number}`} className="run-card">
                        <span className="ref mono">
                          {entityKey('run', r.number)} · v{r.methodVersion}
                        </span>
                        <span className="run-card__title">{r.title}</span>
                        <span className="run-card__progress">
                          <ProgressBar value={p.done} total={p.total} />
                          <span className="mono">
                            {p.done}/{p.total}
                          </span>
                        </span>
                        <span className="muted run-card__time">iniciada {timeAgo(r.startedAt)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}

          <div className="section-bar">
            <h2 className="section-bar__title">Biblioteca</h2>
            <Segmented
              label="Exibir métodos"
              value={scope}
              onChange={setScope}
              options={[
                { id: 'ativos', label: 'Ativos' },
                { id: 'arquivados', label: 'Arquivados' },
              ]}
            />
          </div>

          {list.length === 0 && <p className="muted">Nenhum método {scope === 'ativos' ? 'ativo' : 'arquivado'}.</p>}

          {categories.length > 0 && (
            <div className="chip-filter" role="group" aria-label="Filtrar por categoria">
              <button type="button" className={cx('chip chip--toggle', !category && 'is-on')} aria-pressed={!category} onClick={() => setCategory('')}>
                Todas
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cx('chip chip--toggle', category === c && 'is-on')}
                  aria-pressed={category === c}
                  onClick={() => setCategory(category === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <ul className="method-grid">
            {list.map((m) => {
              const mine = runs.filter((r) => r.methodId === m.id)
              const checkItems = m.steps.reduce((n, s) => n + s.checklist.length, 0)
              const last = mine[0]
              return (
                <li key={m.id} className="method-card panel">
                  <div className="method-card__top">
                    <span className="ref mono">{entityKey('method', m.number)}</span>
                    {m.category && <span className="pill pill--neutral">{m.category}</span>}
                    <span className="version mono">v{m.version}</span>
                  </div>
                  <Link to={`/metodos/${m.number}`} className="method-card__title">
                    {m.title}
                  </Link>
                  {m.summary && <p className="method-card__summary">{m.summary}</p>}
                  <ol className="method-card__steps" aria-label="Etapas">
                    {m.steps.map((s, i) => (
                      <li key={s.id}>
                        <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                        {s.title}
                      </li>
                    ))}
                  </ol>
                  <p className="method-card__meta mono">
                    {m.steps.length} etapas · {checkItems} itens · {mine.length} execuç{mine.length === 1 ? 'ão' : 'ões'}
                    {last && ` · última ${formatShortDate(isoFromTimestamp(last.startedAt))}`}
                  </p>
                  <div className="method-card__actions">
                    <Button size="sm" variant="primary" icon={Play} onClick={() => start(m.id)} disabled={m.archived}>
                      Iniciar execução
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Copy}
                      onClick={async () => {
                        const c = await duplicateMethod(m.id)
                        if (c) toast(`Duplicado como ${entityKey('method', c.number)}`)
                      }}
                    >
                      Duplicar
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <MethodForm open={creating} onClose={() => setCreating(false)} categories={categories} onSaved={(m) => navigate(`/metodos/${m.number}`)} />
    </div>
  )
}
