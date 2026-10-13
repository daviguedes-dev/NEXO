import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { CalendarDays, GripVertical, Plus } from 'lucide-react'
import type { Post, PostStatus } from '../../db/types'
import { setPostStatus } from '../../db/posts'
import { formatShortDate, isoFromTimestamp, todayISO } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { POST_STATUSES } from '../../lib/meta'
import { ProgressBar, cx } from '../../components/ui'

export function PostCard({ post, overlay }: { post: Post; overlay?: boolean }) {
  const done = post.stages.filter((s) => s.done).length
  const today = todayISO()
  const late = post.status !== 'published' && post.scheduledDate && post.scheduledDate < today
  return (
    <article className={cx('kcard pcard', overlay && 'is-overlay')}>
      <header className="kcard__top">
        <span className="ref mono">{entityKey('post', post.number)}</span>
        {post.status === 'published' && post.publishedAt ? (
          <span className="due is-published">publicada {formatShortDate(isoFromTimestamp(post.publishedAt))}</span>
        ) : (
          post.scheduledDate && (
            <span className={cx('due', late && 'is-overdue')}>
              <CalendarDays size={13} aria-hidden />
              {formatShortDate(post.scheduledDate)}
              {post.scheduledTime && ` ${post.scheduledTime}`}
            </span>
          )
        )}
      </header>
      <Link to={`/publicacoes/${post.number}`} className="kcard__title" onClick={(e) => overlay && e.preventDefault()}>
        {post.title}
      </Link>
      {post.platforms.length > 0 && (
        <div className="kcard__labels">
          {post.platforms.map((p) => (
            <span key={p} className="tag tag--static">
              {p}
            </span>
          ))}
        </div>
      )}
      {post.stages.length > 0 && (
        <footer className="kcard__foot pcard__progress">
          <ProgressBar value={done} total={post.stages.length} label={`${done} de ${post.stages.length} etapas`} />
          <span className="mono muted">
            {done}/{post.stages.length}
          </span>
        </footer>
      )}
    </article>
  )
}

export function PostBoard({ posts, onCreate }: { posts: Post[]; onCreate: (status: PostStatus) => void }) {
  const [dragging, setDragging] = useState<Post | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))
  const label = (id: unknown) => POST_STATUSES.find((s) => s.id === id)?.label

  const onEnd = (e: DragEndEvent) => {
    setDragging(null)
    const to = e.over?.id as PostStatus | undefined
    const p = posts.find((x) => x.id === e.active.id)
    if (p && to && to !== p.status) void setPostStatus(p.id, to)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDragging(posts.find((p) => p.id === e.active.id) ?? null)}
      onDragEnd={onEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Pegou ${posts.find((p) => p.id === active.id)?.title ?? 'publicação'}.`,
          onDragOver: ({ over }) => (over ? `Sobre ${label(over.id)}.` : 'Fora das colunas.'),
          onDragEnd: ({ over }) => (over ? `Movida para ${label(over.id)}.` : 'Movimento cancelado.'),
          onDragCancel: () => 'Movimento cancelado.',
        },
        screenReaderInstructions: { draggable: 'Pressione espaço para pegar, setas para mudar de coluna e espaço para soltar.' },
      }}
    >
      <div className="board board--posts">
        {POST_STATUSES.map((s) => {
          const items = posts
            .filter((p) => p.status === s.id)
            .sort((a, b) => (s.id === 'published' ? (b.publishedAt ?? 0) - (a.publishedAt ?? 0) : (a.scheduledDate ?? '9999').localeCompare(b.scheduledDate ?? '9999')))
          return (
            <Column key={s.id} id={s.id} label={s.label} hint={s.hint} count={items.length} onCreate={s.id === 'published' ? undefined : () => onCreate(s.id)}>
              {items.map((p) => (
                <Draggable key={p.id} post={p} />
              ))}
            </Column>
          )
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' }}>{dragging ? <PostCard post={dragging} overlay /> : null}</DragOverlay>
    </DndContext>
  )
}

function Column({ id, label, hint, count, children, onCreate }: { id: PostStatus; label: string; hint: string; count: number; children: React.ReactNode; onCreate?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section ref={setNodeRef} className={cx('board__col', isOver && 'is-over', `board__col--${id}`)} aria-label={`${label}: ${count}`}>
      <header className="board__head">
        <span className={cx('stage-dot', `stage-dot--${id}`)} aria-hidden />
        <h3 title={hint}>{label}</h3>
        <span className="count mono">{count}</span>
        {onCreate && (
          <button type="button" className="btn btn--ghost btn--sm btn--icon board__add" aria-label={`Nova publicação em ${label}`} onClick={onCreate}>
            <Plus size={15} aria-hidden />
          </button>
        )}
      </header>
      <div className="board__cards">{children}</div>
    </section>
  )
}

function Draggable({ post }: { post: Post }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: post.id })
  const { onKeyDown, ...pointer } = listeners ?? {}
  return (
    <div ref={setNodeRef} className={cx('drag', isDragging && 'is-dragging')} {...pointer}>
      <PostCard post={post} />
      <div className="drag__tools">
        <button type="button" ref={setActivatorNodeRef} {...attributes} onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined} className="drag__grip" aria-roledescription="alça de arrastar" aria-label={`Mover “${post.title}” entre colunas`}>
          <GripVertical size={14} aria-hidden />
        </button>
      </div>
    </div>
  )
}
