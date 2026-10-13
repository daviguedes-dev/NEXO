import type { Priority, Task, TaskStatus } from '../../db/types'
import { addDays, todayISO } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { priorityRank } from '../../lib/meta'
import { sortTasks, type TaskSort } from '../../db/tasks'

export type DueFilter = 'overdue' | 'today' | 'week' | 'none' | ''

export interface TaskFilters {
  q: string
  status: TaskStatus[]
  priority: Priority[]
  label: string
  project: string
  due: DueFilter
  sort: TaskSort
  showDone: boolean
}

export function readFilters(sp: URLSearchParams): TaskFilters {
  const list = <T extends string>(k: string) => (sp.get(k)?.split(',').filter(Boolean) ?? []) as T[]
  return {
    q: sp.get('q') ?? '',
    status: list<TaskStatus>('status'),
    priority: list<Priority>('prioridade'),
    label: sp.get('etiqueta') ?? '',
    project: sp.get('projeto') ?? '',
    due: (sp.get('prazo') ?? '') as DueFilter,
    sort: (sp.get('ordem') as TaskSort) || 'priority',
    showDone: sp.get('concluidas') !== '0',
  }
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function applyFilters(tasks: Task[], f: TaskFilters, today = todayISO()): Task[] {
  const q = normalize(f.q.trim())
  const weekEnd = addDays(today, 7)
  const out = tasks.filter((t) => {
    if (f.status.length && !f.status.includes(t.status)) return false
    if (!f.showDone && t.status === 'done') return false
    if (f.priority.length && !f.priority.includes(t.priority)) return false
    if (f.label && !t.labels.includes(f.label)) return false
    if (f.project && t.projectId !== f.project) return false
    if (f.due) {
      const open = t.status !== 'done'
      if (f.due === 'none' && t.dueDate) return false
      if (f.due === 'overdue' && !(open && t.dueDate && t.dueDate < today)) return false
      if (f.due === 'today' && t.dueDate !== today) return false
      if (f.due === 'week' && !(t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd)) return false
    }
    if (q) {
      const hay = normalize(`${entityKey('task', t.number)} ${t.title} ${t.notes} ${t.subtasks.map((s) => s.title).join(' ')}`)
      if (!hay.includes(q)) return false
    }
    return true
  })
  return sortTasks(out, f.sort, priorityRank)
}

export const activeFilterCount = (f: TaskFilters) =>
  (f.status.length ? 1 : 0) + (f.priority.length ? 1 : 0) + (f.label ? 1 : 0) + (f.project ? 1 : 0) + (f.due ? 1 : 0) + (f.showDone ? 0 : 1)
