import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarRange, Columns3, Copy, ExternalLink, LayoutTemplate, Megaphone, Plus, Send } from 'lucide-react'
import { usePosts, useTemplates } from '../../db/hooks'
import type { PostTemplate } from '../../db/types'
import { createTemplate, duplicateTemplate } from '../../db/posts'
import { formatFullDate, isoFromTimestamp } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { useToast } from '../../components/feedback'
import { Button, EmptyState, PageHeader, Panel, cx } from '../../components/ui'
import { NotFound } from '../shell/NotFound'
import { NewPostDialog, type PostDefaults } from './NewPostDialog'
import { PostBoard } from './PostBoard'
import { PostCalendar } from './PostCalendar'
import { PostDrawer } from './PostDrawer'

const NO_TEMPLATES: PostTemplate[] = []

type Tab = 'fluxo' | 'calendario' | 'modelos' | 'publicadas'

const TABS: { id: Tab; label: string; icon: typeof Columns3 }[] = [
  { id: 'fluxo', label: 'Fluxo', icon: Columns3 },
  { id: 'calendario', label: 'Calendário', icon: CalendarRange },
  { id: 'modelos', label: 'Modelos', icon: LayoutTemplate },
  { id: 'publicadas', label: 'Publicadas', icon: Send },
]

export function PublishingPage() {
  const posts = usePosts()
  const templates = useTemplates() ?? NO_TEMPLATES
  const [sp, setSp] = useSearchParams()
  const { number } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const tab = (TABS.find((t) => t.id === sp.get('aba'))?.id ?? 'fluxo') as Tab
  const [creating, setCreating] = useState<PostDefaults | null>(null)

  useEffect(() => {
    if (sp.get('nova') === '1') {
      setCreating({})
      const next = new URLSearchParams(sp)
      next.delete('nova')
      setSp(next, { replace: true })
    }
  }, [sp, setSp])

  const platformSuggestions = useMemo(() => {
    const all = new Set<string>()
    for (const t of templates) t.platforms.forEach((p) => all.add(p))
    for (const p of posts ?? []) p.platforms.forEach((x) => all.add(x))
    return [...all].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [templates, posts])

  const selected = number ? posts?.find((p) => String(p.number) === number) : undefined
  if (number && posts && !selected) return <NotFound what="Publicação" />

  const published = (posts ?? []).filter((p) => p.status === 'published').sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
  const inFlow = (posts ?? []).filter((p) => p.status !== 'published').length
  const back = `/publicacoes${sp.toString() ? `?${sp}` : ''}`

  const newTemplate = async () => {
    const t = await createTemplate({ name: 'Novo modelo', stages: [] })
    navigate(`/publicacoes/modelos/${t.number}`)
  }

  return (
    <div className="page page--wide">
      <PageHeader
        section="publicações"
        title="Publicações"
        description={posts ? `${inFlow} em produção · ${published.length} publicadas. Modelos genéricos, para qualquer canal ou formato.` : ' '}
        actions={
          <>
            <Button icon={LayoutTemplate} onClick={newTemplate}>
              Novo modelo
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreating({})}>
              Nova publicação
            </Button>
          </>
        }
      />

      <nav className="tabs" aria-label="Visualizações de publicações">
        {TABS.map((t) => (
          <Link
            key={t.id}
            to={t.id === 'fluxo' ? '/publicacoes' : `/publicacoes?aba=${t.id}`}
            className={cx('tabs__item', tab === t.id && 'is-active')}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <t.icon size={15} aria-hidden />
            {t.label}
            {t.id === 'modelos' && <span className="count mono">{templates.filter((x) => !x.archived).length}</span>}
            {t.id === 'publicadas' && <span className="count mono">{published.length}</span>}
          </Link>
        ))}
      </nav>

      {posts && posts.length === 0 && templates.length === 0 && tab !== 'modelos' ? (
        <EmptyState
          icon={Megaphone}
          title="Organize sua produção de conteúdo"
          action={
            <>
              <Button icon={LayoutTemplate} onClick={newTemplate}>
                Criar um modelo
              </Button>
              <Button variant="primary" icon={Plus} onClick={() => setCreating({})}>
                Nova publicação
              </Button>
            </>
          }
        >
          Crie modelos reutilizáveis com etapas, objetivo e plataformas, e acompanhe cada publicação da ideia ao registro final — em Kanban ou calendário.
        </EmptyState>
      ) : tab === 'fluxo' ? (
        <PostBoard posts={posts ?? []} onCreate={(status) => setCreating({ status })} />
      ) : tab === 'calendario' ? (
        <PostCalendar posts={posts ?? []} onCreate={(d) => setCreating({ scheduledDate: d })} />
      ) : tab === 'modelos' ? (
        templates.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="Nenhum modelo"
            action={
              <Button variant="primary" icon={Plus} onClick={newTemplate}>
                Criar modelo
              </Button>
            }
          >
            Um modelo guarda o “método de postagem”: etapas de produção, estrutura do texto, objetivo e plataformas.
          </EmptyState>
        ) : (
          <ul className="template-grid">
            {templates.map((t) => {
              const uses = (posts ?? []).filter((p) => p.templateId === t.id).length
              return (
                <li key={t.id} className={cx('template-card panel', t.archived && 'is-dim')}>
                  <div className="method-card__top">
                    <span className="ref mono">{entityKey('template', t.number)}</span>
                    {t.archived && <span className="pill pill--paused">Arquivado</span>}
                  </div>
                  <Link to={`/publicacoes/modelos/${t.number}`} className="method-card__title">
                    {t.name}
                  </Link>
                  {t.description && <p className="method-card__summary">{t.description}</p>}
                  <ol className="stage-chain" aria-label="Etapas">
                    {t.stages.map((s) => (
                      <li key={s.id}>{s.title}</li>
                    ))}
                  </ol>
                  <p className="method-card__meta mono">
                    {t.platforms.length ? t.platforms.join(' · ') : 'sem plataforma definida'} · {uses} uso{uses === 1 ? '' : 's'}
                  </p>
                  <div className="method-card__actions">
                    <Button size="sm" variant="primary" icon={Plus} disabled={t.archived} onClick={() => setCreating({ templateId: t.id })}>
                      Usar modelo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Copy}
                      onClick={async () => {
                        const c = await duplicateTemplate(t.id)
                        if (c) toast(`Duplicado como ${entityKey('template', c.number)}`)
                      }}
                    >
                      Duplicar
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      ) : (
        <Panel title="Registro de publicações concluídas" count={published.length}>
          {published.length === 0 ? (
            <p className="muted">Quando uma publicação for marcada como “Publicada”, ela aparece aqui com data, plataformas e links.</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Publicação</th>
                    <th scope="col">Plataformas</th>
                    <th scope="col">Modelo</th>
                    <th scope="col">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {published.map((p) => {
                    const t = templates.find((x) => x.id === p.templateId)
                    return (
                      <tr key={p.id}>
                        <td className="mono nowrap">{p.publishedAt ? formatFullDate(isoFromTimestamp(p.publishedAt)) : '—'}</td>
                        <td>
                          <Link to={`/publicacoes/${p.number}?aba=publicadas`} className="table__title">
                            {p.title}
                          </Link>
                          <span className="ref mono">{entityKey('post', p.number)}</span>
                        </td>
                        <td>{p.platforms.join(', ') || <span className="muted">—</span>}</td>
                        <td>{t ? t.name : <span className="muted">—</span>}</td>
                        <td>
                          {p.links.length ? (
                            p.links.map((l) => (
                              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="link-inline">
                                {l.platform || 'link'} <ExternalLink size={11} aria-hidden />
                              </a>
                            ))
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <NewPostDialog
        open={!!creating}
        defaults={creating ?? undefined}
        templates={templates}
        onClose={() => setCreating(null)}
        onCreated={(n) => navigate(`/publicacoes/${n}${sp.toString() ? `?${sp}` : ''}`)}
      />
      <PostDrawer post={selected} templates={templates} platformSuggestions={platformSuggestions} onClose={() => navigate(back)} />
    </div>
  )
}
