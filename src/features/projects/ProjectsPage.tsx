import { useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderKanban, MoreHorizontal, Plus } from 'lucide-react'
import type { Project, ProjectStatus } from '../../db/types'
import { useProjects, useTasks } from '../../db/hooks'
import { createProject, deleteProject, updateProject } from '../../db/tasks'
import { entityKey } from '../../lib/ids'
import { PROJECT_STATUSES, SWATCHES, projectStatusLabel } from '../../lib/meta'
import { Dialog } from '../../components/Dialog'
import { Menu } from '../../components/Menu'
import { useConfirm, useToast } from '../../components/feedback'
import { Button, EmptyState, Field, Input, PageHeader, ProgressBar, Select, Swatches, TextArea, cx } from '../../components/ui'
import { DueDate } from '../tasks/parts'

export function ProjectsPage() {
  const projects = useProjects()
  const tasks = useTasks() ?? []
  const [sp, setSp] = useSearchParams()
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    if (sp.get('novo') === '1') {
      setEditing('new')
      setSp({}, { replace: true })
    }
  }, [sp, setSp])

  const order: ProjectStatus[] = ['active', 'paused', 'done']
  const sorted = [...projects].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.updatedAt - a.updatedAt)

  return (
    <div className="page">
      <PageHeader
        section="projetos"
        title="Projetos"
        description="Agrupe tarefas relacionadas e acompanhe o avanço de cada frente."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
            Novo projeto
          </Button>
        }
      />
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Nenhum projeto" action={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Criar projeto</Button>}>
          Projetos reúnem tarefas com um objetivo comum. O progresso é calculado pelas tarefas concluídas.
        </EmptyState>
      ) : (
        <ul className="project-grid">
          {sorted.map((p) => {
            const list = tasks.filter((t) => t.projectId === p.id)
            const done = list.filter((t) => t.status === 'done').length
            return (
              <li key={p.id} className={cx('project-card panel', p.status !== 'active' && 'is-dim')} style={{ ['--c' as string]: p.color }}>
                <header className="project-card__head">
                  <span className="ref mono">{entityKey('project', p.number)}</span>
                  <span className={cx('pill', `pill--${p.status}`)}>{projectStatusLabel(p.status)}</span>
                  <Menu
                    label={`Ações do projeto ${p.name}`}
                    align="end"
                    triggerClassName="btn btn--ghost btn--sm btn--icon"
                    trigger={<MoreHorizontal size={16} aria-hidden />}
                    items={[
                      { id: 'edit', label: 'Editar', onSelect: () => setEditing(p) },
                      ...PROJECT_STATUSES.filter((s) => s.id !== p.status).map((s) => ({ id: s.id, label: `Marcar como ${s.label.toLowerCase()}`, onSelect: () => updateProject(p.id, { status: s.id }) })),
                      {
                        id: 'del',
                        label: 'Excluir projeto',
                        danger: true,
                        onSelect: async () => {
                          if (await confirm({ title: `Excluir ${p.name}?`, message: 'As tarefas do projeto são mantidas, apenas perdem o vínculo.', confirmLabel: 'Excluir', danger: true })) {
                            await deleteProject(p.id)
                            toast('Projeto excluído')
                          }
                        },
                      },
                    ]}
                  />
                </header>
                <h2 className="project-card__name">
                  <span className="project-card__swatch" aria-hidden />
                  {p.name}
                </h2>
                {p.description && <p className="project-card__desc">{p.description}</p>}
                <div className="project-card__progress">
                  <ProgressBar value={done} total={list.length} label={`${done} de ${list.length} tarefas concluídas`} />
                  <span className="mono muted">
                    {done}/{list.length}
                  </span>
                </div>
                <footer className="project-card__foot">
                  <Link to={`/tarefas?projeto=${p.id}`} className="link">
                    Ver tarefas
                  </Link>
                  {p.dueDate && <DueDate date={p.dueDate} done={p.status === 'done'} />}
                </footer>
              </li>
            )
          })}
        </ul>
      )}
      <ProjectDialog project={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function ProjectDialog({ project, onClose }: { project: Project | 'new' | null; onClose: () => void }) {
  const id = useId()
  const toast = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [color, setColor] = useState(SWATCHES[0])
  const [due, setDue] = useState('')

  useEffect(() => {
    if (!project) return
    const p = project === 'new' ? null : project
    setName(p?.name ?? '')
    setDescription(p?.description ?? '')
    setStatus(p?.status ?? 'active')
    setColor(p?.color ?? SWATCHES[0])
    setDue(p?.dueDate ?? '')
  }, [project])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const data = { name, description, status, color, dueDate: due || null }
    if (project === 'new') {
      const p = await createProject(data)
      toast(`${entityKey('project', p.number)} criado`)
    } else if (project) {
      await updateProject(project.id, { ...data, name: name.trim() })
      toast('Projeto atualizado')
    }
    onClose()
  }

  return (
    <Dialog
      open={!!project}
      onClose={onClose}
      title={project === 'new' ? 'Novo projeto' : 'Editar projeto'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form={`${id}-f`} disabled={!name.trim()}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={`${id}-f`} className="form" onSubmit={submit}>
        <Field label="Nome" htmlFor={`${id}-n`}>
          <Input id={`${id}-n`} autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Descrição" htmlFor={`${id}-d`}>
          <TextArea id={`${id}-d`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="form__grid">
          <Field label="Status" htmlFor={`${id}-s`}>
            <Select id={`${id}-s`} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prazo" htmlFor={`${id}-due`}>
            <Input id={`${id}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
        <Field label="Cor">
          <Swatches value={color} onChange={setColor} colors={SWATCHES} label="Cor do projeto" />
        </Field>
      </form>
    </Dialog>
  )
}
