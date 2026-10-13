import { useEffect, useId, useState } from 'react'
import { FileText, LayoutTemplate } from 'lucide-react'
import type { ISODate, PostStatus, PostTemplate } from '../../db/types'
import { createPost, createPostFromTemplate } from '../../db/posts'
import { entityKey } from '../../lib/ids'
import { POST_STATUSES } from '../../lib/meta'
import { Dialog } from '../../components/Dialog'
import { useToast } from '../../components/feedback'
import { Button, Field, Input, Select, cx } from '../../components/ui'

export interface PostDefaults {
  status?: PostStatus
  scheduledDate?: ISODate
  templateId?: string
}

export function NewPostDialog({ open, onClose, templates, defaults, onCreated }: { open: boolean; onClose: () => void; templates: PostTemplate[]; defaults?: PostDefaults; onCreated?: (n: number) => void }) {
  const id = useId()
  const toast = useToast()
  const [templateId, setTemplateId] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<PostStatus>('idea')
  const [date, setDate] = useState('')

  useEffect(() => {
    if (!open) return
    setTemplateId(defaults?.templateId ?? '')
    setTitle('')
    setStatus(defaults?.status ?? (defaults?.scheduledDate ? 'scheduled' : 'idea'))
    setDate(defaults?.scheduledDate ?? '')
  }, [open, defaults?.templateId, defaults?.status, defaults?.scheduledDate])

  const usable = templates.filter((t) => !t.archived)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const extra = { title, status, scheduledDate: date || null }
    const post = templateId ? await createPostFromTemplate(templateId, extra) : await createPost(extra)
    if (post) {
      toast(`${entityKey('post', post.number)} criada`)
      onCreated?.(post.number)
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nova publicação"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form={`${id}-f`} disabled={!title.trim()}>
            Criar publicação
          </Button>
        </>
      }
    >
      <form id={`${id}-f`} className="form" onSubmit={submit}>
        <fieldset className="fieldset">
          <legend className="field__label">Ponto de partida</legend>
          <div className="template-choice" role="radiogroup" aria-label="Modelo">
            <button type="button" role="radio" aria-checked={!templateId} className={cx('template-choice__item', !templateId && 'is-on')} onClick={() => setTemplateId('')}>
              <FileText size={16} aria-hidden />
              <span>
                <strong>Em branco</strong>
                <span className="muted">Sem etapas pré-definidas</span>
              </span>
            </button>
            {usable.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={templateId === t.id} className={cx('template-choice__item', templateId === t.id && 'is-on')} onClick={() => setTemplateId(t.id)}>
                <LayoutTemplate size={16} aria-hidden />
                <span>
                  <strong>{t.name}</strong>
                  <span className="muted">
                    {t.stages.length} etapas{t.platforms.length ? ` · ${t.platforms.join(', ')}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Título" htmlFor={`${id}-t`}>
          <Input id={`${id}-t`} autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sobre o que é esta publicação?" />
        </Field>
        <div className="form__grid">
          <Field label="Status inicial" htmlFor={`${id}-s`}>
            <Select id={`${id}-s`} value={status} onChange={(e) => setStatus(e.target.value as PostStatus)}>
              {POST_STATUSES.filter((s) => s.id !== 'published').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data prevista" htmlFor={`${id}-d`} hint="Opcional">
            <Input id={`${id}-d`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </form>
    </Dialog>
  )
}
