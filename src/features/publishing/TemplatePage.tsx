import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Check, Copy, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import type { Post, PostStage } from '../../db/types'
import { useEntityActivity, usePosts, useTemplates } from '../../db/hooks'
import { createPostFromTemplate, deleteTemplate, duplicateTemplate, updateTemplate } from '../../db/posts'
import { entityKey, uid } from '../../lib/ids'
import { postStatusLabel } from '../../lib/meta'
import { Menu } from '../../components/Menu'
import { TagInput } from '../../components/TagInput'
import { useConfirm, useToast } from '../../components/feedback'
import { Timeline } from '../../components/Timeline'
import { Button, Field, Input, PageHeader, Panel, TextArea } from '../../components/ui'
import { NotFound } from '../shell/NotFound'

const NO_POSTS: Post[] = []

/** Editor de modelo (método de postagem). Mudanças não afetam publicações já criadas. */
export function TemplatePage() {
  const { number } = useParams()
  const templates = useTemplates()
  const posts = usePosts() ?? NO_POSTS
  const tpl = templates?.find((t) => String(t.number) === number)
  const history = useEntityActivity(tpl?.id)
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [objective, setObjective] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [stages, setStages] = useState<PostStage[]>([])
  const [body, setBody] = useState('')
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!tpl) return
    setName(tpl.name)
    setDescription(tpl.description)
    setObjective(tpl.objective)
    setPlatforms(tpl.platforms)
    setStages(tpl.stages)
    setBody(tpl.body)
    // recarrega apenas ao trocar de modelo, para não sobrescrever a edição em andamento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpl?.id])

  const suggestions = useMemo(() => [...new Set([...(templates ?? []).flatMap((t) => t.platforms), ...posts.flatMap((p) => p.platforms)])], [templates, posts])

  if (!templates) return null
  if (!tpl) return <NotFound what="Modelo" />

  const key = entityKey('template', tpl.number)
  const dirty =
    name !== tpl.name || description !== tpl.description || objective !== tpl.objective || body !== tpl.body || JSON.stringify(platforms) !== JSON.stringify(tpl.platforms) || JSON.stringify(stages) !== JSON.stringify(tpl.stages)
  const uses = posts.filter((p) => p.templateId === tpl.id)

  const save = async () => {
    if (!name.trim()) return
    await updateTemplate(tpl.id, { name: name.trim(), description, objective, platforms, stages: stages.filter((s) => s.title.trim()), body })
    toast('Modelo salvo — publicações existentes não mudam')
  }

  const move = (i: number, dir: -1 | 1) =>
    setStages((s) => {
      const out = [...s]
      ;[out[i], out[i + dir]] = [out[i + dir], out[i]]
      return out
    })

  return (
    <div className="page">
      <PageHeader
        section={`publicações / modelos / ${key}`}
        title={tpl.name}
        description={
          <>
            Modelo de postagem reutilizável · {uses.length} publicaç{uses.length === 1 ? 'ão' : 'ões'} criada{uses.length === 1 ? '' : 's'} a partir dele
          </>
        }
        actions={
          <>
            <Button
              icon={Plus}
              disabled={tpl.archived || dirty}
              title={dirty ? 'Salve as alterações antes' : undefined}
              onClick={async () => {
                const p = await createPostFromTemplate(tpl.id, { title: `${tpl.name} — nova publicação` })
                if (p) navigate(`/publicacoes/${p.number}`)
              }}
            >
              Usar modelo
            </Button>
            <Button variant="primary" icon={Check} onClick={save} disabled={!dirty || !name.trim()}>
              Salvar
            </Button>
            <Menu
              label="Mais ações"
              align="end"
              triggerClassName="btn btn--ghost btn--md btn--icon"
              trigger={<MoreHorizontal size={16} aria-hidden />}
              items={[
                {
                  id: 'dup',
                  label: 'Duplicar',
                  icon: <Copy size={14} aria-hidden />,
                  onSelect: async () => {
                    const c = await duplicateTemplate(tpl.id)
                    if (c) navigate(`/publicacoes/modelos/${c.number}`)
                  },
                },
                {
                  id: 'arch',
                  label: tpl.archived ? 'Restaurar' : 'Arquivar',
                  icon: tpl.archived ? <ArchiveRestore size={14} aria-hidden /> : <Archive size={14} aria-hidden />,
                  onSelect: () => updateTemplate(tpl.id, { archived: !tpl.archived }),
                },
                {
                  id: 'del',
                  label: 'Excluir modelo',
                  danger: true,
                  onSelect: async () => {
                    if (!(await confirm({ title: `Excluir ${key}?`, message: 'As publicações criadas a partir dele são mantidas.', confirmLabel: 'Excluir', danger: true }))) return
                    await deleteTemplate(tpl.id)
                    navigate('/publicacoes?aba=modelos')
                  },
                },
              ]}
            />
          </>
        }
      />

      <div className="split">
        <div className="split__main">
          <Panel title="Definição">
            <div className="form">
              <Field label="Nome" htmlFor="tpl-name">
                <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Descrição" htmlFor="tpl-desc">
                <Input id="tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Formato e quando usar" />
              </Field>
              <Field label="Objetivo padrão" htmlFor="tpl-obj">
                <Input id="tpl-obj" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="O que publicações deste tipo buscam" />
              </Field>
              <Field label="Plataformas" hint="Qualquer canal: blog, newsletter, rede social, vídeo, podcast, mural interno…">
                <TagInput label="Plataformas do modelo" value={platforms} onChange={setPlatforms} suggestions={suggestions} placeholder="Digite e pressione Enter" />
              </Field>
            </div>
          </Panel>

          <Panel title="Etapas de produção" count={stages.length}>
            <ol className="step-editor step-editor--stages">
              {stages.map((s, i) => (
                <li key={s.id}>
                  <span className="step-editor__n mono">{i + 1}</span>
                  <Input value={s.title} aria-label={`Etapa ${i + 1}`} onChange={(e) => setStages((all) => all.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))} />
                  <Input value={s.description} aria-label={`Descrição da etapa ${i + 1}`} placeholder="Descrição (opcional)" onChange={(e) => setStages((all) => all.map((x) => (x.id === s.id ? { ...x, description: e.target.value } : x)))} />
                  <Button variant="ghost" size="sm" iconOnly icon={ArrowUp} aria-label="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)} />
                  <Button variant="ghost" size="sm" iconOnly icon={ArrowDown} aria-label="Mover para baixo" disabled={i === stages.length - 1} onClick={() => move(i, 1)} />
                  <Button variant="ghost" size="sm" iconOnly icon={Trash2} aria-label={`Remover etapa ${i + 1}`} onClick={() => setStages((all) => all.filter((x) => x.id !== s.id))} />
                </li>
              ))}
            </ol>
            <div className="inline-add inline-add--boxed">
              <Plus size={15} aria-hidden />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Adicionar etapa (ex.: Roteiro, Revisão, Agendamento) e pressionar Enter"
                aria-label="Nova etapa"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.trim()) {
                    e.preventDefault()
                    setStages((s) => [...s, { id: uid(), title: draft.trim(), description: '' }])
                    setDraft('')
                  }
                }}
              />
            </div>
          </Panel>

          <Panel title="Estrutura do texto">
            <TextArea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="textarea--code" aria-label="Estrutura do texto" placeholder={'Gancho\n\nDesenvolvimento\n\nChamada para ação'} />
            <p className="field__hint">É copiada para cada nova publicação como ponto de partida.</p>
          </Panel>
          {dirty && (
            <div className="savebar" role="status">
              <span>Alterações não salvas</span>
              <Button variant="primary" icon={Check} onClick={save} disabled={!name.trim()}>
                Salvar modelo
              </Button>
            </div>
          )}
        </div>
        <aside className="split__side">
          <Panel title="Publicações deste modelo" count={uses.length}>
            {uses.length === 0 ? (
              <p className="muted small">Nenhuma ainda.</p>
            ) : (
              <ul className="plain-list">
                {uses.map((p) => (
                  <li key={p.id}>
                    <Link to={`/publicacoes/${p.number}`}>{p.title}</Link>
                    <span className="muted small">{postStatusLabel(p.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Histórico">
            <Timeline items={history} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
