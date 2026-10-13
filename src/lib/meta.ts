import type { PostStatus, Priority, ProjectStatus, RunStatus, TaskStatus } from '../db/types'

export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'A fazer' },
  { id: 'doing', label: 'Em andamento' },
  { id: 'review', label: 'Em revisão' },
  { id: 'done', label: 'Concluída' },
]

export const taskStatusLabel = (s: TaskStatus) => TASK_STATUSES.find((x) => x.id === s)?.label ?? s

export const PRIORITIES: { id: Priority; label: string; rank: number }[] = [
  { id: 'urgent', label: 'Urgente', rank: 0 },
  { id: 'high', label: 'Alta', rank: 1 },
  { id: 'medium', label: 'Média', rank: 2 },
  { id: 'low', label: 'Baixa', rank: 3 },
  { id: 'none', label: 'Sem prioridade', rank: 4 },
]

export const priorityLabel = (p: Priority) => PRIORITIES.find((x) => x.id === p)?.label ?? p
export const priorityRank = (p: Priority) => PRIORITIES.find((x) => x.id === p)?.rank ?? 4

export const POST_STATUSES: { id: PostStatus; label: string; hint: string }[] = [
  { id: 'idea', label: 'Ideia', hint: 'Pautas e rascunhos iniciais' },
  { id: 'production', label: 'Em produção', hint: 'Texto, mídia e materiais' },
  { id: 'review', label: 'Revisão', hint: 'Conferência antes de agendar' },
  { id: 'scheduled', label: 'Agendada', hint: 'Com data definida' },
  { id: 'published', label: 'Publicada', hint: 'Registro do que foi ao ar' },
]

export const postStatusLabel = (s: PostStatus) => POST_STATUSES.find((x) => x.id === s)?.label ?? s

export const PROJECT_STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: 'active', label: 'Em andamento' },
  { id: 'paused', label: 'Pausado' },
  { id: 'done', label: 'Concluído' },
]

export const projectStatusLabel = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.id === s)?.label ?? s

export const RUN_STATUSES: { id: RunStatus; label: string }[] = [
  { id: 'active', label: 'Em execução' },
  { id: 'completed', label: 'Concluída' },
  { id: 'canceled', label: 'Cancelada' },
]

export const runStatusLabel = (s: RunStatus) => RUN_STATUSES.find((x) => x.id === s)?.label ?? s

/** Cores para etiquetas e projetos: tons sóbrios, legíveis sobre branco. */
export const SWATCHES = [
  '#14B8A6',
  '#0EA5E9',
  '#6366F1',
  '#A855F7',
  '#EC4899',
  '#F43F5E',
  '#F97316',
  '#CA8A04',
  '#16A34A',
  '#64748B',
]
