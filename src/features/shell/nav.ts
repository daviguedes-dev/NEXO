import { BookOpenCheck, FolderKanban, LayoutDashboard, ListChecks, Megaphone, Repeat2 } from 'lucide-react'

export const NAV = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks, group: 'Execução' },
  { to: '/projetos', label: 'Projetos', icon: FolderKanban, group: 'Execução' },
  { to: '/rotinas', label: 'Rotinas', icon: Repeat2, group: 'Execução' },
  { to: '/metodos', label: 'Métodos de trabalho', icon: BookOpenCheck, group: 'Processos' },
  { to: '/publicacoes', label: 'Publicações', icon: Megaphone, group: 'Processos' },
] as const

export const CREATE = [
  { id: 'task', label: 'Nova tarefa', to: '/tarefas?nova=1', icon: ListChecks, key: 'C' },
  { id: 'routine', label: 'Nova rotina', to: '/rotinas?nova=1', icon: Repeat2 },
  { id: 'method', label: 'Novo método', to: '/metodos?novo=1', icon: BookOpenCheck },
  { id: 'post', label: 'Nova publicação', to: '/publicacoes?nova=1', icon: Megaphone },
  { id: 'project', label: 'Novo projeto', to: '/projetos?novo=1', icon: FolderKanban },
] as const
