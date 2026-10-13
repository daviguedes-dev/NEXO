import { useEffect, useId, useState } from 'react'
import type { ID, ISODate, Priority, TaskStatus } from '../../db/types'
import { PRIORITIES, TASK_STATUSES } from '../../lib/meta'
import { createTask } from '../../db/tasks'
import { useLabels, useProjects } from '../../db/hooks'
import { entityKey } from '../../lib/ids'
import { Dialog } from '../../components/Dialog'
import { useToast } from '../../components/feedback'
import { Button, Field, Input, Select, TextArea } from '../../components/ui'
import { LabelPicker } from './LabelPicker'

export interface TaskDefaults {
  status?: TaskStatus
  projectId?: ID | null
  dueDate?: ISODate | null
}

export function NewTaskDialog({ open, onClose, defaults }: { open: boolean; onClose: () => void; defaults?: TaskDefaults }) {
  const labels = useLabels()
  const projects = useProjects()
  const toast = useToast()
  const id = useId()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<Priority>('none')
  const [due, setDue] = useState('')
  const [project, setProject] = useState('')
  const [labelIds, setLabelIds] = useState<ID[]>([])
  const [more, setMore] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setNotes('')
    setStatus(defaults?.status ?? 'todo')
    setPriority('none')
    setDue(defaults?.dueDate ?? '')
    setProject(defaults?.projectId ?? '')
    setLabelIds([])
  }, [open, defaults?.status, defaults?.dueDate, defaults?.projectId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const task = await createTask({ title, notes, status, priority, dueDate: due || null, projectId: project || null, labels: labelIds })
    toast(`${entityKey('task', task.number)} criada`)
    if (more) {
      setTitle('')
      setNotes('')
      document.getElementById(`${id}-title`)?.focus()
    } else onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nova tarefa"
      footer={
        <>
          <label className="inline-check">
            <input type="checkbox" checked={more} onChange={(e) => setMore(e.target.checked)} /> Criar outra em seguida
          </label>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form={`${id}-form`} disabled={!title.trim()}>
            Criar tarefa
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} className="form" onSubmit={submit}>
        <Field label="Título" htmlFor={`${id}-title`}>
          <Input id={`${id}-title`} autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" />
        </Field>
        <Field label="Observações" htmlFor={`${id}-notes`}>
          <TextArea
            id={`${id}-notes`}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexto, links, critérios de conclusão…"
          />
        </Field>
        <div className="form__grid">
          <Field label="Status" htmlFor={`${id}-status`}>
            <Select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridade" htmlFor={`${id}-priority`}>
            <Select id={`${id}-priority`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prazo" htmlFor={`${id}-due`}>
            <Input id={`${id}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Projeto" htmlFor={`${id}-project`}>
            <Select id={`${id}-project`} value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">Sem projeto</option>
              {projects
                .filter((p) => p.status !== 'done' || p.id === project)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <Field label="Etiquetas">
          <LabelPicker labels={labels} value={labelIds} onChange={setLabelIds} />
        </Field>
      </form>
    </Dialog>
  )
}
