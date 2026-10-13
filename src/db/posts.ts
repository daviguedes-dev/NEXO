import { db } from './database'
import { logActivity, nextNumber } from './history'
import type { ID, Post, PostStatus, PostTemplate } from './types'
import { formatShortDate } from '../lib/dates'
import { entityKey, uid } from '../lib/ids'
import { postStatusLabel } from '../lib/meta'

const TX = [db.posts, db.templates, db.activity, db.counters] as const

function logPost(p: Post, action: string, message: string) {
  return logActivity({ type: 'post', id: p.id, number: p.number, title: p.title, action, message })
}
function logTemplate(t: PostTemplate, action: string, message: string) {
  return logActivity({ type: 'template', id: t.id, number: t.number, title: t.name, action, message })
}

/* -------------------------------------------------------------- modelos */

export type TemplateInput = Partial<Omit<PostTemplate, 'id' | 'number' | 'createdAt' | 'updatedAt'>> & { name: string }

export async function createTemplate(input: TemplateInput): Promise<PostTemplate> {
  return db.transaction('rw', TX, async () => {
    const now = Date.now()
    const t: PostTemplate = {
      id: uid(),
      number: await nextNumber('template'),
      name: input.name.trim(),
      description: input.description ?? '',
      objective: input.objective ?? '',
      platforms: input.platforms ?? [],
      stages: input.stages ?? [],
      body: input.body ?? '',
      archived: false,
      createdAt: now,
      updatedAt: now,
    }
    await db.templates.add(t)
    await logTemplate(t, 'created', 'criou o modelo de postagem')
    return t
  })
}

export async function updateTemplate(id: ID, patch: Partial<Omit<PostTemplate, 'id' | 'number' | 'createdAt'>>) {
  await db.transaction('rw', TX, async () => {
    const before = await db.templates.get(id)
    if (!before) return
    const next = { ...before, ...patch, updatedAt: Date.now() }
    await db.templates.put(next)
    if (patch.archived !== undefined && patch.archived !== before.archived) {
      await logTemplate(next, patch.archived ? 'archived' : 'restored', patch.archived ? 'arquivou o modelo' : 'restaurou o modelo')
    } else {
      await logTemplate(next, 'updated', 'atualizou o modelo (publicações existentes não mudam)')
    }
  })
}

export async function duplicateTemplate(id: ID) {
  const src = await db.templates.get(id)
  if (!src) return
  return createTemplate({
    ...src,
    name: `${src.name} (cópia)`,
    stages: src.stages.map((s) => ({ ...s, id: uid() })),
  })
}

export async function deleteTemplate(id: ID) {
  await db.transaction('rw', TX, async () => {
    const t = await db.templates.get(id)
    if (!t) return
    await db.templates.delete(id)
    await db.posts.where('templateId').equals(id).modify({ templateId: null })
    await logTemplate(t, 'deleted', 'excluiu o modelo (publicações foram mantidas)')
  })
}

/* ----------------------------------------------------------- publicações */

export type PostInput = Partial<Omit<Post, 'id' | 'number' | 'createdAt' | 'updatedAt'>> & { title: string }

export async function createPost(input: PostInput): Promise<Post> {
  return db.transaction('rw', TX, async () => {
    const now = Date.now()
    const status = input.status ?? 'idea'
    const post: Post = {
      id: uid(),
      number: await nextNumber('post'),
      title: input.title.trim(),
      templateId: input.templateId ?? null,
      objective: input.objective ?? '',
      platforms: input.platforms ?? [],
      status,
      scheduledDate: input.scheduledDate ?? null,
      scheduledTime: input.scheduledTime ?? null,
      publishedAt: status === 'published' ? (input.publishedAt ?? now) : null,
      body: input.body ?? '',
      notes: input.notes ?? '',
      stages: input.stages ?? [],
      links: input.links ?? [],
      createdAt: now,
      updatedAt: now,
    }
    await db.posts.add(post)
    const tpl = post.templateId ? await db.templates.get(post.templateId) : undefined
    await logPost(post, 'created', tpl ? `criou a partir do modelo ${entityKey('template', tpl.number)} · ${tpl.name}` : `criou a publicação em ${postStatusLabel(status)}`)
    return post
  })
}

/** Cria uma publicação com etapas, texto, objetivo e plataformas copiados do modelo. */
export async function createPostFromTemplate(templateId: ID, overrides: Partial<PostInput> = {}): Promise<Post | undefined> {
  const t = await db.templates.get(templateId)
  if (!t) return
  return createPost({
    title: overrides.title ?? t.name,
    templateId: t.id,
    objective: t.objective,
    platforms: [...t.platforms],
    body: t.body,
    stages: t.stages.map((s) => ({ ...s, done: false })),
    ...overrides,
  })
}

export async function updatePost(id: ID, patch: Partial<Omit<Post, 'id' | 'number' | 'createdAt'>>) {
  await db.transaction('rw', TX, async () => {
    const before = await db.posts.get(id)
    if (!before) return
    const now = Date.now()
    const next: Post = { ...before, ...patch, updatedAt: now }
    if (patch.status && patch.status !== before.status) {
      if (patch.status === 'published') next.publishedAt = patch.publishedAt ?? before.publishedAt ?? now
      else next.publishedAt = null
    }
    await db.posts.put(next)

    if (patch.status && patch.status !== before.status) {
      const msg =
        patch.status === 'published'
          ? 'registrou a publicação como concluída'
          : before.status === 'published'
            ? `reabriu a publicação em ${postStatusLabel(patch.status)}`
            : `moveu de ${postStatusLabel(before.status)} para ${postStatusLabel(patch.status)}`
      await logPost(next, patch.status === 'published' ? 'published' : 'status', msg)
    }
    if (patch.scheduledDate !== undefined && patch.scheduledDate !== before.scheduledDate) {
      await logPost(next, 'schedule', patch.scheduledDate ? `definiu a data para ${formatShortDate(patch.scheduledDate)}` : 'removeu a data')
    }
    if (patch.title !== undefined && patch.title.trim() !== before.title) {
      await logPost(next, 'renamed', `renomeou de “${before.title}”`)
    }
  })
}

export async function setPostStatus(id: ID, status: PostStatus) {
  return updatePost(id, { status })
}

export async function toggleStage(postId: ID, stageId: ID) {
  await db.transaction('rw', TX, async () => {
    const p = await db.posts.get(postId)
    if (!p) return
    const stages = p.stages.map((s) => (s.id === stageId ? { ...s, done: !s.done } : s))
    await db.posts.update(postId, { stages, updatedAt: Date.now() })
    const s = stages.find((x) => x.id === stageId)
    if (s) await logPost(p, 'stage', s.done ? `concluiu a etapa “${s.title}”` : `reabriu a etapa “${s.title}”`)
  })
}

export async function deletePost(id: ID) {
  await db.transaction('rw', TX, async () => {
    const p = await db.posts.get(id)
    if (!p) return
    await db.posts.delete(id)
    await logPost(p, 'deleted', 'excluiu a publicação')
  })
}
