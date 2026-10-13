import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Columns3, Filter, ListChecks, Plus, Rows3, Search, X } from 'lucide-react'
import type { Priority, TaskStatus } from '../../db/types'
import { useLabels, useProjects, useTasks } from '../../db/hooks'
import { PRIORITIES, TASK_STATUSES } from '../../lib/meta'
import type { TaskSort } from '../../db/tasks'
import { Menu } from '../../components/Menu'
import { PriorityIcon, StatusIcon } from '../../components/icons'
import { Button, EmptyState, Input, PageHeader, Segmented, Select, cx } from '../../components/ui'
import { activeFilterCount, applyFilters, readFilters, type DueFilter } from './filters'
import { NewTaskDialog, type TaskDefaults } from './NewTaskDialog'
import { TaskBoard } from './TaskBoard'
import { TaskDrawer } from './TaskDrawer'
import { TaskList } from './TaskList'
import { NotFound } from '../shell/NotFound'

type View = 'lista' | 'quadro'

const DUE_OPTIONS: { id: DueFilter; label: string }[] = [
  { id: '', label: 'Qualquer prazo' },
  { id: 'overdue', label: 'Vencidas' },
  { id: 'today', label: 'Vencem hoje' },
  { id: 'week', label: 'Próximos 7 dias' },
  { id: 'none', label: 'Sem prazo' },
]

const SORTS: { id: TaskSort; label: string }[] = [
  { id: 'priority', label: 'Prioridade' },
  { id: 'due', label: 'Prazo' },
  { id: 'updated', label: 'Atualização recente' },
  { id: 'created', label: 'Criação recente' },
  { id: 'title', label: 'Título (A–Z)' },
]

export function TasksPage() {
  const tasks = useTasks()
  const labels = useLabels()
  const projects = useProjects()
  const [sp, setSp] = useSearchParams()
  const { number } = useParams()
  const navigate = useNavigate()
  const filters = readFilters(sp)
  const view: View = sp.get('visao') === 'quadro' ? 'quadro' : 'lista'
  const [creating, setCreating] = useState<TaskDefaults | null>(null)
  const [query, setQuery] = useState(filters.q)

  // atalho global / menu "Novo" chegam com ?nova=1
  useEffect(() => {
    if (sp.get('nova') === '1') {
      setCreating({ projectId: filters.project || null })
      const next = new URLSearchParams(sp)
      next.delete('nova')
      setSp(next, { replace: true })
    }
  }, [sp, setSp, filters.project])

  // busca com pequeno atraso para não poluir o histórico do navegador
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (query !== filters.q) set({ q: query || null })
    }, 200)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function set(patch: Record<string, string | null>) {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    setSp(next, { replace: true })
  }

  const visible = useMemo(() => (tasks ? applyFilters(tasks, view === 'quadro' ? { ...filters, status: [] } : filters) : []), [tasks, filters, view])
  const search = sp.toString() ? `?${sp.toString()}` : ''
  const selected = number ? tasks?.find((t) => String(t.number) === number) : undefined
  const nFilters = activeFilterCount(filters)

  const toggleIn = <T extends string>(key: string, list: T[], v: T) => set({ [key]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(',') || null })

  if (number && tasks && !selected) return <NotFound what="Tarefa" />

  const open = tasks?.filter((t) => t.status !== 'done').length ?? 0

  return (
    <div className="page page--wide">
      <PageHeader
        section="tarefas"
        title="Tarefas"
        description={tasks ? `${open} em aberto · ${tasks.length - open} concluídas` : ' '}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating({ projectId: filters.project || null })}>
            Nova tarefa
          </Button>
        }
      />

      <div className="toolbar" role="search">
        <label className="toolbar__search">
          <Search size={15} aria-hidden />
          <span className="sr-only">Pesquisar tarefas</span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por título, observação ou TSK-…" />
          {query && (
            <button type="button" className="toolbar__clear" aria-label="Limpar pesquisa" onClick={() => setQuery('')}>
              <X size={14} aria-hidden />
            </button>
          )}
        </label>

        <div className="toolbar__filters">
          {view === 'lista' && (
            <Menu
              label="Filtrar por status"
              heading="Status"
              triggerClassName={cx('filter-btn', filters.status.length > 0 && 'is-active')}
              trigger={
                <>
                  Status{filters.status.length > 0 && <span className="filter-btn__n mono">{filters.status.length}</span>}
                </>
              }
              items={TASK_STATUSES.map((s) => ({
                id: s.id,
                label: s.label,
                icon: <StatusIcon status={s.id} />,
                selected: filters.status.includes(s.id),
                onSelect: () => toggleIn<TaskStatus>('status', filters.status, s.id),
              }))}
            />
          )}
          <Menu
            label="Filtrar por prioridade"
            heading="Prioridade"
            triggerClassName={cx('filter-btn', filters.priority.length > 0 && 'is-active')}
            trigger={
              <>
                Prioridade{filters.priority.length > 0 && <span className="filter-btn__n mono">{filters.priority.length}</span>}
              </>
            }
            items={PRIORITIES.map((p) => ({
              id: p.id,
              label: p.label,
              icon: <PriorityIcon priority={p.id} />,
              selected: filters.priority.includes(p.id),
              onSelect: () => toggleIn<Priority>('prioridade', filters.priority, p.id),
            }))}
          />
          <Menu
            label="Filtrar por etiqueta"
            heading="Etiqueta"
            triggerClassName={cx('filter-btn', !!filters.label && 'is-active')}
            trigger={<>{labels.find((l) => l.id === filters.label)?.name ?? 'Etiqueta'}</>}
            items={[
              { id: 'all', label: 'Todas', selected: !filters.label, onSelect: () => set({ etiqueta: null }) },
              ...labels.map((l) => ({
                id: l.id,
                label: l.name,
                icon: <span className="dot" style={{ background: l.color }} />,
                selected: filters.label === l.id,
                onSelect: () => set({ etiqueta: l.id }),
              })),
            ]}
          />
          <Menu
            label="Filtrar por projeto"
            heading="Projeto"
            triggerClassName={cx('filter-btn', !!filters.project && 'is-active')}
            trigger={<>{projects.find((p) => p.id === filters.project)?.name ?? 'Projeto'}</>}
            items={[
              { id: 'all', label: 'Todos', selected: !filters.project, onSelect: () => set({ projeto: null }) },
              ...projects.map((p) => ({
                id: p.id,
                label: p.name,
                icon: <span className="dot" style={{ background: p.color }} />,
                selected: filters.project === p.id,
                onSelect: () => set({ projeto: p.id }),
              })),
            ]}
          />
          <Menu
            label="Filtrar por prazo"
            heading="Prazo"
            triggerClassName={cx('filter-btn', !!filters.due && 'is-active')}
            trigger={<>{DUE_OPTIONS.find((d) => d.id === filters.due)?.label ?? 'Prazo'}</>}
            items={DUE_OPTIONS.map((d) => ({ id: d.id || 'any', label: d.label, selected: filters.due === d.id, onSelect: () => set({ prazo: d.id || null }) }))}
          />
          <label className="inline-check">
            <input type="checkbox" checked={filters.showDone} onChange={(e) => set({ concluidas: e.target.checked ? null : '0' })} />
            Mostrar concluídas
          </label>
          {nFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={() => {
                setQuery('')
                set({ status: null, prioridade: null, etiqueta: null, projeto: null, prazo: null, concluidas: null, q: null })
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>

        <div className="toolbar__end">
          <label className="toolbar__sort">
            <span className="muted">Ordenar</span>
            <Select value={filters.sort} onChange={(e) => set({ ordem: e.target.value === 'priority' ? null : e.target.value })} aria-label="Ordenar tarefas">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
          <Segmented<View>
            label="Visualização"
            value={view}
            onChange={(v) => set({ visao: v === 'quadro' ? 'quadro' : null })}
            options={[
              { id: 'lista', label: 'Lista', icon: Rows3 },
              { id: 'quadro', label: 'Kanban', icon: Columns3 },
            ]}
          />
        </div>
      </div>

      {!tasks ? null : tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhuma tarefa ainda" action={<Button variant="primary" icon={Plus} onClick={() => setCreating({})}>Criar a primeira tarefa</Button>}>
          Registre o que precisa ser feito, defina prioridade e prazo, e acompanhe tudo em lista ou Kanban. Pressione <kbd className="kbd">C</kbd> em qualquer tela.
        </EmptyState>
      ) : visible.length === 0 && view === 'lista' ? (
        <EmptyState icon={Filter} title="Nenhuma tarefa com esses filtros" compact>
          Ajuste a pesquisa ou limpe os filtros para ver mais resultados.
        </EmptyState>
      ) : view === 'quadro' ? (
        <TaskBoard tasks={visible} labels={labels} projects={projects} search={search} onCreate={(status) => setCreating({ status, projectId: filters.project || null })} />
      ) : (
        <TaskList tasks={visible} labels={labels} projects={projects} search={search} grouped={filters.sort === 'priority' || filters.sort === 'due'} />
      )}

      <NewTaskDialog open={!!creating} defaults={creating ?? undefined} onClose={() => setCreating(null)} />
      <TaskDrawer task={selected} labels={labels} projects={projects} onClose={() => navigate(`/tarefas${search}`)} />
    </div>
  )
}
