import { CalendarDays, ListTree } from 'lucide-react'
import type { ISODate, Label, Priority, Project, Task, TaskStatus } from '../../db/types'
import { relativeDay, todayISO } from '../../lib/dates'
import { PRIORITIES, TASK_STATUSES } from '../../lib/meta'
import { setTaskStatus, updateTask } from '../../db/tasks'
import { Menu } from '../../components/Menu'
import { PriorityIcon, StatusIcon } from '../../components/icons'
import { cx } from '../../components/ui'

export function LabelChip({ label }: { label: Label }) {
  return (
    <span className="chip" style={{ ['--c' as string]: label.color }}>
      <span className="chip__dot" aria-hidden />
      {label.name}
    </span>
  )
}

export function ProjectTag({ project }: { project: Project }) {
  return (
    <span className="project-tag" title={`Projeto: ${project.name}`}>
      <span className="project-tag__dot" style={{ background: project.color }} aria-hidden />
      {project.name}
    </span>
  )
}

export function DueDate({ date, done, today = todayISO() }: { date: ISODate; done?: boolean; today?: ISODate }) {
  const overdue = !done && date < today
  const soon = !done && date === today
  return (
    <span className={cx('due', overdue && 'is-overdue', soon && 'is-today')} title={overdue ? 'Prazo vencido' : 'Prazo'}>
      <CalendarDays size={13} aria-hidden />
      {relativeDay(date, today)}
    </span>
  )
}

export function SubtaskCount({ task }: { task: Task }) {
  if (!task.subtasks.length) return null
  const done = task.subtasks.filter((s) => s.done).length
  return (
    <span className={cx('subcount mono', done === task.subtasks.length && 'is-complete')} title={`${done} de ${task.subtasks.length} subtarefas concluídas`}>
      <ListTree size={13} aria-hidden />
      {done}/{task.subtasks.length}
    </span>
  )
}

export function StatusMenu({ task, compact }: { task: Pick<Task, 'id' | 'status'>; compact?: boolean }) {
  return (
    <Menu
      label="Alterar status"
      heading="Status"
      triggerClassName={cx('icon-trigger', compact && 'icon-trigger--sm')}
      trigger={<StatusIcon status={task.status} title />}
      items={TASK_STATUSES.map((s) => ({
        id: s.id,
        label: s.label,
        icon: <StatusIcon status={s.id} />,
        selected: s.id === task.status,
        onSelect: () => setTaskStatus(task.id, s.id as TaskStatus),
      }))}
    />
  )
}

export function PriorityMenu({ task }: { task: Pick<Task, 'id' | 'priority'> }) {
  return (
    <Menu
      label="Alterar prioridade"
      heading="Prioridade"
      triggerClassName="icon-trigger"
      trigger={<PriorityIcon priority={task.priority} title />}
      items={PRIORITIES.map((p) => ({
        id: p.id,
        label: p.label,
        icon: <PriorityIcon priority={p.id} />,
        selected: p.id === task.priority,
        onSelect: () => updateTask(task.id, { priority: p.id as Priority }),
      }))}
    />
  )
}
