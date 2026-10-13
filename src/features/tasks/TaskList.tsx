import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { Label, Project, Task } from '../../db/types'
import { entityKey } from '../../lib/ids'
import { TASK_STATUSES } from '../../lib/meta'
import { StatusIcon } from '../../components/icons'
import { cx } from '../../components/ui'
import { DueDate, LabelChip, PriorityMenu, ProjectTag, StatusMenu, SubtaskCount } from './parts'

interface Props {
  tasks: Task[]
  labels: Label[]
  projects: Project[]
  grouped: boolean
  search: string
}

export function TaskList({ tasks, labels, projects, grouped, search }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true })
  const labelMap = new Map(labels.map((l) => [l.id, l]))
  const projectMap = new Map(projects.map((p) => [p.id, p]))

  const row = (t: Task) => (
    <li key={t.id} className={cx('task-row', t.status === 'done' && 'is-done')}>
      <StatusMenu task={t} />
      <PriorityMenu task={t} />
      <span className="ref mono task-row__key">{entityKey('task', t.number)}</span>
      <Link to={`/tarefas/${t.number}${search}`} className="task-row__title">
        {t.title}
      </Link>
      <span className="task-row__labels">
        {t.labels.map((id) => labelMap.get(id)).filter(Boolean).map((l) => <LabelChip key={l!.id} label={l!} />)}
      </span>
      <span className="task-row__meta">
        <SubtaskCount task={t} />
        {t.projectId && projectMap.get(t.projectId) && <ProjectTag project={projectMap.get(t.projectId)!} />}
        {t.dueDate && <DueDate date={t.dueDate} done={t.status === 'done'} />}
      </span>
    </li>
  )

  if (!grouped) return <ul className="task-list panel">{tasks.map(row)}</ul>

  return (
    <div className="task-groups">
      {TASK_STATUSES.map((s) => {
        const items = tasks.filter((t) => t.status === s.id)
        if (!items.length) return null
        const isCollapsed = collapsed[s.id] ?? false
        return (
          <section key={s.id} className="task-group panel" aria-label={s.label}>
            <button type="button" className="task-group__head" aria-expanded={!isCollapsed} onClick={() => setCollapsed((c) => ({ ...c, [s.id]: !isCollapsed }))}>
              <ChevronDown size={15} className={cx('chev', isCollapsed && 'is-collapsed')} aria-hidden />
              <StatusIcon status={s.id} />
              <span className="task-group__name">{s.label}</span>
              <span className="count mono">{items.length}</span>
            </button>
            {!isCollapsed && <ul className="task-list">{items.map(row)}</ul>}
          </section>
        )
      })}
    </div>
  )
}
