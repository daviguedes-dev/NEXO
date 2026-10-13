import { useEffect, useId, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import type { Label, Priority, Project, Task, TaskStatus } from '../../db/types'
import { formatDateTime } from '../../lib/dates'
import { entityKey } from '../../lib/ids'
import { PRIORITIES, TASK_STATUSES } from '../../lib/meta'
import { addSubtask, deleteTask, moveSubtask, removeSubtask, renameSubtask, toggleSubtask, updateTask } from '../../db/tasks'
import { useEntityActivity } from '../../db/hooks'
import { Dialog } from '../../components/Dialog'
import { useConfirm, useToast } from '../../components/feedback'
import { PriorityIcon, StatusIcon } from '../../components/icons'
import { Timeline } from '../../components/Timeline'
import { Button, Checkbox, Field, Input, ProgressBar, Select, TextArea } from '../../components/ui'
import { LabelPicker } from './LabelPicker'

interface Props {
  task: Task | undefined
  labels: Label[]
  projects: Project[]
  onClose: () => void
}

/** Painel lateral de detalhes: tudo é salvo ao sair do campo, e mudanças relevantes vão para o histórico. */
export function TaskDrawer({ task, labels, projects, onClose }: Props) {
  const history = useEntityActivity(task?.id)
  const confirm = useConfirm()
  const toast = useToast()
  const id = useId()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [newSub, setNewSub] = useState('')

  useEffect(() => {
    setTitle(task?.title ?? '')
    setNotes(task?.notes ?? '')
  }, [task?.id, task?.title, task?.notes])

  if (!task)
    return (
      <Dialog open={false} onClose={onClose} title="">
        {null}
      </Dialog>
    )

  const doneSubs = task.subtasks.filter((s) => s.done).length
  const saveTitle = () => {
    const t = title.trim()
    if (!t) setTitle(task.title)
    else if (t !== task.title) void updateTask(task.id, { title: t })
  }

  const remove = async () => {
    const ok = await confirm({
      title: `Excluir ${entityKey('task', task.number)}?`,
      message: 'A tarefa sai das listas e do quadro. O registro da exclusão permanece no histórico geral.',
      confirmLabel: 'Excluir tarefa',
      danger: true,
    })
    if (!ok) return
    onClose()
    await deleteTask(task.id)
    toast(`${entityKey('task', task.number)} excluída`)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      variant="sheet"
      size="lg"
      eyebrow={
        <>
          <span className="ref mono">{entityKey('task', task.number)}</span>
          <span className="muted">criada em {formatDateTime(task.createdAt)}</span>
        </>
      }
      title={<span className="sr-only">{task.title}</span>}
      headerActions={<Button variant="ghost" size="sm" iconOnly icon={Trash2} aria-label="Excluir tarefa" onClick={remove} />}
    >
      <div className="detail">
        <label className="sr-only" htmlFor={`${id}-title`}>
          Título
        </label>
        <TextArea
          id={`${id}-title`}
          className="detail__title"
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLTextAreaElement).blur()
            }
          }}
        />

        <dl className="props">
          <div className="props__row">
            <dt>
              <label htmlFor={`${id}-status`}>Status</label>
            </dt>
            <dd className="props__with-icon">
              <StatusIcon status={task.status} />
              <Select id={`${id}-status`} value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}>
                {TASK_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </dd>
          </div>
          <div className="props__row">
            <dt>
              <label htmlFor={`${id}-priority`}>Prioridade</label>
            </dt>
            <dd className="props__with-icon">
              <PriorityIcon priority={task.priority} />
              <Select id={`${id}-priority`} value={task.priority} onChange={(e) => updateTask(task.id, { priority: e.target.value as Priority })}>
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </dd>
          </div>
          <div className="props__row">
            <dt>
              <label htmlFor={`${id}-due`}>Prazo</label>
            </dt>
            <dd className="props__with-icon">
              <Input id={`${id}-due`} type="date" value={task.dueDate ?? ''} onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })} />
              {task.dueDate && (
                <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Remover prazo" onClick={() => updateTask(task.id, { dueDate: null })} />
              )}
            </dd>
          </div>
          <div className="props__row">
            <dt>
              <label htmlFor={`${id}-project`}>Projeto</label>
            </dt>
            <dd>
              <Select id={`${id}-project`} value={task.projectId ?? ''} onChange={(e) => updateTask(task.id, { projectId: e.target.value || null })}>
                <option value="">Sem projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </dd>
          </div>
          <div className="props__row props__row--top">
            <dt>Etiquetas</dt>
            <dd>
              <LabelPicker labels={labels} value={task.labels} onChange={(v) => updateTask(task.id, { labels: v })} />
            </dd>
          </div>
        </dl>

        <Field label="Observações" htmlFor={`${id}-notes`}>
          <TextArea
            id={`${id}-notes`}
            rows={4}
            value={notes}
            placeholder="Contexto, decisões, links…"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== task.notes && updateTask(task.id, { notes })}
          />
        </Field>

        <section className="detail__section" aria-labelledby={`${id}-subs`}>
          <header className="detail__section-head">
            <h3 id={`${id}-subs`}>Subtarefas</h3>
            {task.subtasks.length > 0 && (
              <>
                <span className="count mono">
                  {doneSubs}/{task.subtasks.length}
                </span>
                <ProgressBar value={doneSubs} total={task.subtasks.length} />
              </>
            )}
          </header>
          <ul className="subtasks">
            {task.subtasks.map((s, i) => (
              <li key={s.id} className="subtask">
                <Checkbox checked={s.done} onChange={() => toggleSubtask(task.id, s.id)} label={<span className="sr-only">Concluir {s.title}</span>} />
                <input
                  className="subtask__input"
                  defaultValue={s.title}
                  aria-label="Título da subtarefa"
                  onBlur={(e) => e.target.value.trim() && e.target.value !== s.title && renameSubtask(task.id, s.id, e.target.value.trim())}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  style={{ textDecoration: s.done ? 'line-through' : undefined }}
                />
                <span className="subtask__tools">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={ArrowUp}
                    aria-label="Mover para cima"
                    disabled={i === 0}
                    onClick={() => moveSubtask(task.id, s.id, -1)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={ArrowDown}
                    aria-label="Mover para baixo"
                    disabled={i === task.subtasks.length - 1}
                    onClick={() => moveSubtask(task.id, s.id, 1)}
                  />
                  <Button variant="ghost" size="sm" iconOnly icon={Trash2} aria-label={`Remover ${s.title}`} onClick={() => removeSubtask(task.id, s.id)} />
                </span>
              </li>
            ))}
          </ul>
          <form
            className="inline-add"
            onSubmit={(e) => {
              e.preventDefault()
              if (!newSub.trim()) return
              void addSubtask(task.id, newSub)
              setNewSub('')
            }}
          >
            <Plus size={15} aria-hidden />
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Adicionar subtarefa e pressionar Enter"
              aria-label="Nova subtarefa"
            />
          </form>
        </section>

        <section className="detail__section" aria-labelledby={`${id}-hist`}>
          <header className="detail__section-head">
            <h3 id={`${id}-hist`}>Histórico</h3>
            <span className="count mono">{history.length}</span>
          </header>
          <Timeline items={history} />
        </section>
      </div>
    </Dialog>
  )
}
