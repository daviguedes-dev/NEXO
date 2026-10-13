import { db } from './database'
import { logActivity, nextNumber } from './history'
import type { ID, Label, Priority, Project, ProjectStatus, Subtask, Task, TaskStatus } from './types'
import { formatShortDate } from '../lib/dates'
import { uid } from '../lib/ids'
import { priorityLabel, projectStatusLabel, taskStatusLabel } from '../lib/meta'

const TX = [db.tasks, db.activity, db.counters] as const

export type TaskInput = Partial<Omit<Task, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'completedAt'>> & { title: string }

export async function createTask(input: TaskInput): Promise<Task> {
  return db.transaction('rw', TX, async () => {
    const now = Date.now()
    const status = input.status ?? 'todo'
    const task: Task = {
      id: uid(),
      number: await nextNumber('task'),
      title: input.title.trim(),
      notes: input.notes ?? '',
      status,
      priority: input.priority ?? 'none',
      labels: input.labels ?? [],
      projectId: input.projectId ?? null,
      dueDate: input.dueDate ?? null,
      subtasks: input.subtasks ?? [],
      createdAt: now,
      updatedAt: now,
      completedAt: status === 'done' ? now : null,
    }
    await db.tasks.add(task)
    await log(task, 'created', `criou a tarefa em ${taskStatusLabel(status)}`)
    return task
  })
}

function log(task: Task, action: string, message: string) {
  return logActivity({ type: 'task', id: task.id, number: task.number, title: task.title, action, message })
}

/** Atualiza a tarefa e registra no histórico as mudanças importantes. */
export async function updateTask(id: ID, patch: Partial<Omit<Task, 'id' | 'number' | 'createdAt'>>): Promise<void> {
  await db.transaction('rw', [...TX, db.projects], async () => {
    const before = await db.tasks.get(id)
    if (!before) return
    const now = Date.now()
    const next: Task = { ...before, ...patch, updatedAt: now }

    if (patch.status && patch.status !== before.status) {
      next.completedAt = patch.status === 'done' ? now : null
    }
    await db.tasks.put(next)

    if (patch.title !== undefined && patch.title.trim() !== before.title) {
      await log(next, 'renamed', `renomeou de “${before.title}”`)
    }
    if (patch.status && patch.status !== before.status) {
      const msg =
        patch.status === 'done'
          ? 'concluiu a tarefa'
          : before.status === 'done'
            ? `reabriu a tarefa em ${taskStatusLabel(patch.status)}`
            : `moveu de ${taskStatusLabel(before.status)} para ${taskStatusLabel(patch.status)}`
      await log(next, patch.status === 'done' ? 'completed' : 'status', msg)
    }
    if (patch.priority && patch.priority !== before.priority) {
      await log(next, 'priority', `alterou a prioridade de ${priorityLabel(before.priority)} para ${priorityLabel(patch.priority)}`)
    }
    if (patch.dueDate !== undefined && patch.dueDate !== before.dueDate) {
      const msg = patch.dueDate
        ? before.dueDate
          ? `mudou o prazo de ${formatShortDate(before.dueDate)} para ${formatShortDate(patch.dueDate)}`
          : `definiu o prazo para ${formatShortDate(patch.dueDate)}`
        : 'removeu o prazo'
      await log(next, 'due', msg)
    }
    if (patch.projectId !== undefined && patch.projectId !== before.projectId) {
      const project = patch.projectId ? await db.projects.get(patch.projectId) : null
      await log(next, 'project', project ? `vinculou ao projeto ${project.name}` : 'removeu o vínculo com o projeto')
    }
  })
}

export async function setTaskStatus(id: ID, status: TaskStatus) {
  return updateTask(id, { status })
}

export async function deleteTask(id: ID): Promise<void> {
  await db.transaction('rw', TX, async () => {
    const task = await db.tasks.get(id)
    if (!task) return
    await db.tasks.delete(id)
    await log(task, 'deleted', 'excluiu a tarefa')
  })
}

/* ---------------------------------------------------------- subtarefas */

async function mutateSubtasks(taskId: ID, fn: (list: Subtask[], task: Task) => Promise<Subtask[]> | Subtask[]) {
  await db.transaction('rw', TX, async () => {
    const task = await db.tasks.get(taskId)
    if (!task) return
    const subtasks = await fn([...task.subtasks], task)
    await db.tasks.update(taskId, { subtasks, updatedAt: Date.now() })
  })
}

export function addSubtask(taskId: ID, title: string) {
  return mutateSubtasks(taskId, async (list, task) => {
    await log(task, 'subtask', `adicionou a subtarefa “${title.trim()}”`)
    return [...list, { id: uid(), title: title.trim(), done: false }]
  })
}

export function toggleSubtask(taskId: ID, subtaskId: ID) {
  return mutateSubtasks(taskId, async (list, task) => {
    const out = list.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
    const s = out.find((x) => x.id === subtaskId)
    if (s) await log(task, 'subtask', s.done ? `concluiu a subtarefa “${s.title}”` : `reabriu a subtarefa “${s.title}”`)
    return out
  })
}

export function renameSubtask(taskId: ID, subtaskId: ID, title: string) {
  return mutateSubtasks(taskId, (list) => list.map((s) => (s.id === subtaskId ? { ...s, title } : s)))
}

export function removeSubtask(taskId: ID, subtaskId: ID) {
  return mutateSubtasks(taskId, (list) => list.filter((s) => s.id !== subtaskId))
}

export function moveSubtask(taskId: ID, subtaskId: ID, dir: -1 | 1) {
  return mutateSubtasks(taskId, (list) => {
    const i = list.findIndex((s) => s.id === subtaskId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return list
    ;[list[i], list[j]] = [list[j], list[i]]
    return list
  })
}

/* ------------------------------------------------------------ etiquetas */

export async function createLabel(name: string, color: string): Promise<Label> {
  const label: Label = { id: uid(), name: name.trim(), color }
  await db.labels.add(label)
  return label
}

export async function updateLabel(id: ID, patch: Partial<Omit<Label, 'id'>>) {
  await db.labels.update(id, patch)
}

export async function deleteLabel(id: ID) {
  await db.transaction('rw', db.labels, db.tasks, async () => {
    await db.labels.delete(id)
    await db.tasks
      .where('labels')
      .equals(id)
      .modify((t) => {
        t.labels = t.labels.filter((l) => l !== id)
      })
  })
}

/* ------------------------------------------------------------- projetos */

export type ProjectInput = Partial<Omit<Project, 'id' | 'number' | 'createdAt' | 'updatedAt'>> & { name: string }

export async function createProject(input: ProjectInput): Promise<Project> {
  return db.transaction('rw', db.projects, db.activity, db.counters, async () => {
    const now = Date.now()
    const project: Project = {
      id: uid(),
      number: await nextNumber('project'),
      name: input.name.trim(),
      description: input.description ?? '',
      status: input.status ?? 'active',
      color: input.color ?? '#14B8A6',
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await db.projects.add(project)
    await logActivity({ type: 'project', id: project.id, number: project.number, title: project.name, action: 'created', message: 'criou o projeto' })
    return project
  })
}

export async function updateProject(id: ID, patch: Partial<Omit<Project, 'id' | 'number' | 'createdAt'>>) {
  await db.transaction('rw', db.projects, db.activity, async () => {
    const before = await db.projects.get(id)
    if (!before) return
    const next = { ...before, ...patch, updatedAt: Date.now() }
    await db.projects.put(next)
    if (patch.status && patch.status !== before.status) {
      await logActivity({
        type: 'project',
        id,
        number: next.number,
        title: next.name,
        action: 'status',
        message: `marcou o projeto como ${projectStatusLabel(patch.status as ProjectStatus).toLowerCase()}`,
      })
    }
  })
}

export async function deleteProject(id: ID) {
  await db.transaction('rw', db.projects, db.tasks, db.activity, async () => {
    const p = await db.projects.get(id)
    if (!p) return
    await db.projects.delete(id)
    await db.tasks.where('projectId').equals(id).modify({ projectId: null })
    await logActivity({ type: 'project', id, number: p.number, title: p.name, action: 'deleted', message: 'excluiu o projeto (as tarefas foram mantidas)' })
  })
}

/* ---------------------------------------------------------- ordenação */

export type TaskSort = 'updated' | 'created' | 'due' | 'priority' | 'title'

export function sortTasks(list: Task[], sort: TaskSort, priorityRank: (p: Priority) => number): Task[] {
  const out = [...list]
  switch (sort) {
    case 'updated':
      return out.sort((a, b) => b.updatedAt - a.updatedAt)
    case 'created':
      return out.sort((a, b) => b.createdAt - a.createdAt)
    case 'due':
      return out.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || priorityRank(a.priority) - priorityRank(b.priority))
    case 'priority':
      return out.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    case 'title':
      return out.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  }
}
