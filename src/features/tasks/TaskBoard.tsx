import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { GripVertical, Plus } from 'lucide-react'
import type { Label, Project, Task, TaskStatus } from '../../db/types'
import { entityKey } from '../../lib/ids'
import { TASK_STATUSES } from '../../lib/meta'
import { setTaskStatus } from '../../db/tasks'
import { PriorityIcon, StatusIcon } from '../../components/icons'
import { cx } from '../../components/ui'
import { DueDate, LabelChip, ProjectTag, StatusMenu, SubtaskCount } from './parts'

interface Props {
  tasks: Task[]
  labels: Label[]
  projects: Project[]
  search: string
  onCreate: (status: TaskStatus) => void
}

/** Kanban: arraste com mouse, toque ou teclado (espaço para pegar, setas, espaço para soltar). */
export function TaskBoard({ tasks, labels, projects, search, onCreate }: Props) {
  const [dragging, setDragging] = useState<Task | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))
  const labelMap = new Map(labels.map((l) => [l.id, l]))
  const projectMap = new Map(projects.map((p) => [p.id, p]))

  const onStart = (e: DragStartEvent) => setDragging(tasks.find((t) => t.id === e.active.id) ?? null)
  const onEnd = (e: DragEndEvent) => {
    setDragging(null)
    const to = e.over?.id as TaskStatus | undefined
    const task = tasks.find((t) => t.id === e.active.id)
    if (task && to && to !== task.status) void setTaskStatus(task.id, to)
  }

  const card = (t: Task, overlay = false) => (
    <article className={cx('kcard', overlay && 'is-overlay', t.status === 'done' && 'is-done')}>
      <header className="kcard__top">
        <span className="ref mono">{entityKey('task', t.number)}</span>
        <PriorityIcon priority={t.priority} title />
      </header>
      <Link to={`/tarefas/${t.number}${search}`} className="kcard__title" onClick={(e) => overlay && e.preventDefault()}>
        {t.title}
      </Link>
      {t.labels.length > 0 && (
        <div className="kcard__labels">
          {t.labels.map((id) => labelMap.get(id)).filter(Boolean).map((l) => <LabelChip key={l!.id} label={l!} />)}
        </div>
      )}
      {(t.dueDate || t.subtasks.length > 0 || t.projectId) && (
        <footer className="kcard__foot">
          {t.dueDate && <DueDate date={t.dueDate} done={t.status === 'done'} />}
          <SubtaskCount task={t} />
          {t.projectId && projectMap.get(t.projectId) && <ProjectTag project={projectMap.get(t.projectId)!} />}
        </footer>
      )}
    </article>
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onStart}
      onDragEnd={onEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Pegou a tarefa ${tasks.find((t) => t.id === active.id)?.title ?? ''}.`,
          onDragOver: ({ over }) => (over ? `Sobre a coluna ${TASK_STATUSES.find((s) => s.id === over.id)?.label}.` : 'Fora das colunas.'),
          onDragEnd: ({ over }) => (over ? `Tarefa movida para ${TASK_STATUSES.find((s) => s.id === over.id)?.label}.` : 'Movimento cancelado.'),
          onDragCancel: () => 'Movimento cancelado.',
        },
        screenReaderInstructions: { draggable: 'Pressione espaço para pegar a tarefa, use as setas para mudar de coluna e espaço para soltar.' },
      }}
    >
      <div className="board">
        {TASK_STATUSES.map((s) => (
          <Column key={s.id} id={s.id} label={s.label} count={tasks.filter((t) => t.status === s.id).length} onCreate={() => onCreate(s.id)}>
            {tasks
              .filter((t) => t.status === s.id)
              .map((t) => (
                <Draggable key={t.id} id={t.id} title={t.title} status={t.status}>
                  {card(t)}
                </Draggable>
              ))}
          </Column>
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' }}>{dragging ? card(dragging, true) : null}</DragOverlay>
    </DndContext>
  )
}

function Column({ id, label, count, children, onCreate }: { id: TaskStatus; label: string; count: number; children: React.ReactNode; onCreate: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section ref={setNodeRef} className={cx('board__col', isOver && 'is-over')} aria-label={`${label}: ${count} tarefas`}>
      <header className="board__head">
        <StatusIcon status={id} />
        <h3>{label}</h3>
        <span className="count mono">{count}</span>
        <button type="button" className="btn btn--ghost btn--sm btn--icon board__add" aria-label={`Nova tarefa em ${label}`} onClick={onCreate}>
          <Plus size={15} aria-hidden />
        </button>
      </header>
      <div className="board__cards">{children}</div>
    </section>
  )
}

function Draggable({ id, title, status, children }: { id: string; title: string; status: TaskStatus; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id })
  // ponteiro arrasta pelo cartão inteiro; teclado usa a alça dedicada (evita conflito com o link do título)
  const { onKeyDown, ...pointer } = listeners ?? {}
  return (
    <div ref={setNodeRef} className={cx('drag', isDragging && 'is-dragging')} {...pointer}>
      {children}
      <div className="drag__tools">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined}
          className="drag__grip"
          aria-roledescription="alça de arrastar"
          aria-label={`Mover “${title}” entre colunas`}
        >
          <GripVertical size={14} aria-hidden />
        </button>
        <StatusMenu task={{ id, status }} compact />
      </div>
    </div>
  )
}
