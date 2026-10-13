import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Plus, Trash2, X } from 'lucide-react'
import type { Post, PostStatus, PostTemplate } from '../../db/types'
import { deletePost, toggleStage, updatePost } from '../../db/posts'
import { useEntityActivity } from '../../db/hooks'
import { formatDateTime, isoFromTimestamp } from '../../lib/dates'
import { entityKey, uid } from '../../lib/ids'
import { POST_STATUSES } from '../../lib/meta'
import { Dialog } from '../../components/Dialog'
import { useConfirm, useToast } from '../../components/feedback'
import { TagInput } from '../../components/TagInput'
import { Timeline } from '../../components/Timeline'
import { Button, Checkbox, Field, Input, ProgressBar, Select, TextArea } from '../../components/ui'

export function PostDrawer({
  post,
  templates,
  platformSuggestions,
  onClose,
}: {
  post: Post | undefined
  templates: PostTemplate[]
  platformSuggestions: string[]
  onClose: () => void
}) {
  const history = useEntityActivity(post?.id)
  const confirm = useConfirm()
  const toast = useToast()
  const id = useId()
  const [title, setTitle] = useState('')
  const [objective, setObjective] = useState('')
  const [body, setBody] = useState('')
  const [notes, setNotes] = useState('')
  const [newStage, setNewStage] = useState('')
  const [link, setLink] = useState({ platform: '', url: '' })

  useEffect(() => {
    setTitle(post?.title ?? '')
    setObjective(post?.objective ?? '')
    setBody(post?.body ?? '')
    setNotes(post?.notes ?? '')
  }, [post?.id, post?.title, post?.objective, post?.body, post?.notes])

  if (!post)
    return (
      <Dialog open={false} onClose={onClose} title="">
        {null}
      </Dialog>
    )

  const key = entityKey('post', post.number)
  const template = templates.find((t) => t.id === post.templateId)
  const doneStages = post.stages.filter((s) => s.done).length
  const save = (patch: Partial<Post>) => updatePost(post.id, patch)
  const validUrl = /^https?:\/\/\S+\.\S+/i.test(link.url.trim())

  return (
    <Dialog
      open
      onClose={onClose}
      variant="sheet"
      size="lg"
      eyebrow={
        <>
          <span className="ref mono">{key}</span>
          {template ? (
            <span className="muted">
              modelo <Link to={`/publicacoes/modelos/${template.number}`}>{template.name}</Link>
            </span>
          ) : (
            <span className="muted">sem modelo</span>
          )}
        </>
      }
      title={<span className="sr-only">{post.title}</span>}
      headerActions={
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={Trash2}
          aria-label="Excluir publicação"
          onClick={async () => {
            if (
              !(await confirm({
                title: `Excluir ${key}?`,
                message: 'O registro da exclusão permanece no histórico geral.',
                confirmLabel: 'Excluir',
                danger: true,
              }))
            )
              return
            onClose()
            await deletePost(post.id)
            toast(`${key} excluída`)
          }}
        />
      }
    >
      <div className="detail">
        <label className="sr-only" htmlFor={`${id}-title`}>
          Título
        </label>
        <TextArea
          id={`${id}-title`}
          className="detail__title"
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => (title.trim() ? title !== post.title && save({ title: title.trim() }) : setTitle(post.title))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLTextAreaElement).blur()
            }
          }}
        />

        <dl className="props">
          <div className="props__row">
            <dt>
              <label htmlFor={`${id}-status`}>Status</label>
            </dt>
            <dd>
              <Select id={`${id}-status`} value={post.status} onChange={(e) => save({ status: e.target.value as PostStatus })}>
                {POST_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </dd>
          </div>
          <div className="props__row">
            <dt>
              <label htmlFor={`${id}-date`}>Data prevista</label>
            </dt>
            <dd className="props__with-icon">
              <Input id={`${id}-date`} type="date" value={post.scheduledDate ?? ''} onChange={(e) => save({ scheduledDate: e.target.value || null })} />
              <Input
                type="time"
                aria-label="Horário previsto"
                value={post.scheduledTime ?? ''}
                onChange={(e) => save({ scheduledTime: e.target.value || null })}
                className="input--time"
              />
              {post.scheduledDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={X}
                  aria-label="Remover data"
                  onClick={() => save({ scheduledDate: null, scheduledTime: null })}
                />
              )}
            </dd>
          </div>
          {post.status === 'published' && post.publishedAt && (
            <div className="props__row">
              <dt>
                <label htmlFor={`${id}-pub`}>Publicada em</label>
              </dt>
              <dd>
                <Input
                  id={`${id}-pub`}
                  type="date"
                  value={isoFromTimestamp(post.publishedAt)}
                  onChange={(e) => {
                    if (!e.target.value) return
                    const [y, m, d] = e.target.value.split('-').map(Number)
                    const at = new Date(post.publishedAt!)
                    at.setFullYear(y, m - 1, d)
                    save({ publishedAt: at.getTime() })
                  }}
                />
              </dd>
            </div>
          )}
          <div className="props__row props__row--top">
            <dt>Plataformas</dt>
            <dd>
              <TagInput
                label="Plataformas"
                value={post.platforms}
                onChange={(v) => save({ platforms: v })}
                suggestions={platformSuggestions}
                placeholder="Ex.: Blog, Newsletter… (Enter para adicionar)"
              />
            </dd>
          </div>
        </dl>

        <Field label="Objetivo" htmlFor={`${id}-obj`}>
          <Input
            id={`${id}-obj`}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            onBlur={() => objective !== post.objective && save({ objective })}
            placeholder="O que esta publicação deve alcançar?"
          />
        </Field>

        <section className="detail__section" aria-labelledby={`${id}-stages`}>
          <header className="detail__section-head">
            <h3 id={`${id}-stages`}>Etapas de produção</h3>
            {post.stages.length > 0 && (
              <>
                <span className="count mono">
                  {doneStages}/{post.stages.length}
                </span>
                <ProgressBar value={doneStages} total={post.stages.length} />
              </>
            )}
          </header>
          <ul className="subtasks">
            {post.stages.map((s) => (
              <li key={s.id} className="subtask">
                <Checkbox checked={s.done} onChange={() => toggleStage(post.id, s.id)} label={s.title} />
                {s.description && <span className="muted small">{s.description}</span>}
                <span className="subtask__tools">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={Trash2}
                    aria-label={`Remover etapa ${s.title}`}
                    onClick={() => save({ stages: post.stages.filter((x) => x.id !== s.id) })}
                  />
                </span>
              </li>
            ))}
          </ul>
          <form
            className="inline-add"
            onSubmit={(e) => {
              e.preventDefault()
              if (!newStage.trim()) return
              void save({ stages: [...post.stages, { id: uid(), title: newStage.trim(), description: '', done: false }] })
              setNewStage('')
            }}
          >
            <Plus size={15} aria-hidden />
            <input value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="Adicionar etapa e pressionar Enter" aria-label="Nova etapa" />
          </form>
        </section>

        <Field label="Texto" htmlFor={`${id}-body`} hint={<span className="mono">{body.length} caracteres</span>}>
          <TextArea
            id={`${id}-body`}
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => body !== post.body && save({ body })}
            className="textarea--code"
            placeholder="Rascunho do conteúdo"
          />
        </Field>

        <Field label="Observações" htmlFor={`${id}-notes`}>
          <TextArea
            id={`${id}-notes`}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== post.notes && save({ notes })}
            placeholder="Referências, materiais, pendências…"
          />
        </Field>

        <section className="detail__section" aria-labelledby={`${id}-links`}>
          <header className="detail__section-head">
            <h3 id={`${id}-links`}>Links publicados</h3>
            <span className="count mono">{post.links.length}</span>
          </header>
          {post.links.length > 0 && (
            <ul className="links">
              {post.links.map((l) => (
                <li key={l.id}>
                  <span className="pill pill--neutral">{l.platform || 'Link'}</span>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="links__url">
                    {l.url.replace(/^https?:\/\//, '')} <ExternalLink size={12} aria-hidden />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={X}
                    aria-label="Remover link"
                    onClick={() => save({ links: post.links.filter((x) => x.id !== l.id) })}
                  />
                </li>
              ))}
            </ul>
          )}
          <form
            className="link-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!validUrl) return
              void save({ links: [...post.links, { id: uid(), platform: link.platform.trim(), url: link.url.trim() }] })
              setLink({ platform: '', url: '' })
            }}
          >
            <Input
              value={link.platform}
              onChange={(e) => setLink({ ...link, platform: e.target.value })}
              placeholder="Plataforma"
              aria-label="Plataforma do link"
              list={`${id}-plat`}
            />
            <datalist id={`${id}-plat`}>
              {post.platforms.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <Input
              value={link.url}
              onChange={(e) => setLink({ ...link, url: e.target.value })}
              placeholder="https://…"
              aria-label="Endereço do link"
              type="url"
            />
            <Button type="submit" size="sm" disabled={!validUrl}>
              Adicionar
            </Button>
          </form>
        </section>

        <section className="detail__section" aria-labelledby={`${id}-hist`}>
          <header className="detail__section-head">
            <h3 id={`${id}-hist`}>Histórico</h3>
            <span className="muted small">criada em {formatDateTime(post.createdAt)}</span>
          </header>
          <Timeline items={history} />
        </section>
      </div>
    </Dialog>
  )
}
