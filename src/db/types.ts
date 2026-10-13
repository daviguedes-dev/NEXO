/** Identificadores e datas usados em todo o domínio. */
export type ID = string
/** Data local no formato AAAA-MM-DD (sem fuso). */
export type ISODate = string
/** Milissegundos desde a época Unix. */
export type Timestamp = number

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

/* ------------------------------------------------------------------ tarefas */

export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done'

export interface Subtask {
  id: ID
  title: string
  done: boolean
}

export interface Task {
  id: ID
  number: number
  title: string
  notes: string
  status: TaskStatus
  priority: Priority
  labels: ID[]
  projectId: ID | null
  dueDate: ISODate | null
  subtasks: Subtask[]
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null
}

export interface Label {
  id: ID
  name: string
  color: string
}

export type ProjectStatus = 'active' | 'paused' | 'done'

export interface Project {
  id: ID
  number: number
  name: string
  description: string
  status: ProjectStatus
  color: string
  dueDate: ISODate | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

/* ------------------------------------------------------------------ rotinas */

export type RoutineFrequency =
  | { kind: 'daily' }
  /** 0 = domingo … 6 = sábado */
  | { kind: 'weekly'; days: number[] }
  /** A cada N dias, contando a partir de `startDate`. */
  | { kind: 'interval'; every: number }

export interface RoutineStep {
  id: ID
  title: string
}

export interface Routine {
  id: ID
  number: number
  name: string
  description: string
  frequency: RoutineFrequency
  /** Horário no formato HH:MM, opcional. */
  time: string | null
  priority: Priority
  steps: RoutineStep[]
  startDate: ISODate
  archived: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Execução de uma rotina em um dia. Guarda uma cópia das etapas da época,
 *  para que editar a rotina nunca altere o histórico. */
export interface RoutineLog {
  id: ID
  routineId: ID
  date: ISODate
  steps: { id: ID; title: string; done: boolean }[]
  status: 'partial' | 'done'
  note: string
  completedAt: Timestamp | null
  updatedAt: Timestamp
}

/* ------------------------------------------------------- métodos de trabalho */

export interface ChecklistItem {
  id: ID
  text: string
}

export interface MethodStep {
  id: ID
  title: string
  description: string
  checklist: ChecklistItem[]
}

export interface Method {
  id: ID
  number: number
  title: string
  summary: string
  category: string
  /** Documentação livre (Markdown simples). */
  documentation: string
  steps: MethodStep[]
  version: number
  archived: boolean
  duplicatedFrom: ID | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type RunStatus = 'active' | 'completed' | 'canceled'

export interface RunStep {
  id: ID
  title: string
  description: string
  checklist: { id: ID; text: string; done: boolean }[]
}

/** Execução de um método: cópia independente das etapas na versão de origem. */
export interface MethodRun {
  id: ID
  number: number
  methodId: ID
  methodTitle: string
  methodVersion: number
  title: string
  steps: RunStep[]
  status: RunStatus
  notes: string
  startedAt: Timestamp
  completedAt: Timestamp | null
  updatedAt: Timestamp
}

/* ------------------------------------------------------------- publicações */

export type PostStatus = 'idea' | 'production' | 'review' | 'scheduled' | 'published'

export interface PostStage {
  id: ID
  title: string
  description: string
}

/** Modelo (método) de postagem reutilizável, sem vínculo com plataforma específica. */
export interface PostTemplate {
  id: ID
  number: number
  name: string
  description: string
  objective: string
  platforms: string[]
  stages: PostStage[]
  body: string
  archived: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PostLink {
  id: ID
  platform: string
  url: string
}

export interface Post {
  id: ID
  number: number
  title: string
  templateId: ID | null
  objective: string
  platforms: string[]
  status: PostStatus
  scheduledDate: ISODate | null
  scheduledTime: string | null
  publishedAt: Timestamp | null
  body: string
  notes: string
  stages: (PostStage & { done: boolean })[]
  links: PostLink[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

/* ---------------------------------------------------------------- histórico */

export type EntityType = 'task' | 'project' | 'routine' | 'method' | 'run' | 'post' | 'template'

/** Registro imutável de uma mudança relevante (trilha de auditoria). */
export interface Activity {
  id: ID
  at: Timestamp
  day: ISODate
  entityType: EntityType
  entityId: ID
  /** Referência legível, ex.: TSK-12 */
  entityKey: string
  entityTitle: string
  action: string
  message: string
}

export interface Counter {
  name: EntityType
  value: number
}
