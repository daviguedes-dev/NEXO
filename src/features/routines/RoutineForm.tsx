import { useEffect, useId, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { Priority, Routine, RoutineFrequency, RoutineStep } from '../../db/types'
import { WEEKDAYS_SHORT, todayISO } from '../../lib/dates'
import { uid, entityKey } from '../../lib/ids'
import { PRIORITIES } from '../../lib/meta'
import { describeFrequency } from '../../lib/recurrence'
import { createRoutine, updateRoutine } from '../../db/routines'
import { Dialog } from '../../components/Dialog'
import { useToast } from '../../components/feedback'
import { Button, Field, Input, Segmented, Select, TextArea, cx } from '../../components/ui'

type Kind = RoutineFrequency['kind']

export function RoutineForm({ routine, open, onClose, onSaved }: { routine?: Routine; open: boolean; onClose: () => void; onSaved?: (r: Routine) => void }) {
  const id = useId()
  const toast = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<Kind>('daily')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [every, setEvery] = useState(2)
  const [startDate, setStartDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!open) return
    setName(routine?.name ?? '')
    setDescription(routine?.description ?? '')
    const f = routine?.frequency ?? { kind: 'daily' }
    setKind(f.kind)
    setDays(f.kind === 'weekly' ? f.days : [1, 2, 3, 4, 5])
    setEvery(f.kind === 'interval' ? f.every : 2)
    setStartDate(routine?.startDate ?? todayISO())
    setTime(routine?.time ?? '')
    setPriority(routine?.priority ?? 'medium')
    setSteps(routine?.steps ?? [])
    setDraft('')
  }, [open, routine])

  const frequency: RoutineFrequency = kind === 'weekly' ? { kind, days } : kind === 'interval' ? { kind, every: Math.max(2, every) } : { kind: 'daily' }
  const valid = name.trim() && !(kind === 'weekly' && days.length === 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const pending = draft.trim() ? [...steps, { id: uid(), title: draft.trim() }] : steps
    const data = { name: name.trim(), description, frequency, startDate, time: time || null, priority, steps: pending.filter((s) => s.title.trim()) }
    if (routine) {
      await updateRoutine(routine.id, data)
      toast('Rotina atualizada — execuções anteriores preservadas')
      onSaved?.({ ...routine, ...data })
    } else {
      const r = await createRoutine(data)
      toast(`${entityKey('routine', r.number)} criada`)
      onSaved?.(r)
    }
    onClose()
  }

  const move = (i: number, dir: -1 | 1) =>
    setSteps((s) => {
      const out = [...s]
      ;[out[i], out[i + dir]] = [out[i + dir], out[i]]
      return out
    })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={routine ? `Editar ${routine.name}` : 'Nova rotina'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form={`${id}-f`} disabled={!valid}>
            {routine ? 'Salvar alterações' : 'Criar rotina'}
          </Button>
        </>
      }
    >
      <form id={`${id}-f`} className="form" onSubmit={submit}>
        <Field label="Nome" htmlFor={`${id}-n`}>
          <Input id={`${id}-n`} autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Planejamento do dia" />
        </Field>
        <Field label="Descrição" htmlFor={`${id}-d`}>
          <TextArea
            id={`${id}-d`}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Para que serve e como saber que foi bem feita"
          />
        </Field>

        <fieldset className="fieldset">
          <legend className="field__label">Frequência</legend>
          <Segmented<Kind>
            label="Tipo de frequência"
            value={kind}
            onChange={setKind}
            options={[
              { id: 'daily', label: 'Diária' },
              { id: 'weekly', label: 'Semanal' },
              { id: 'interval', label: 'Personalizada' },
            ]}
          />
          {kind === 'weekly' && (
            <div className="weekday-picker" role="group" aria-label="Dias da semana">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days.includes(d)}
                  className={cx('weekday', days.includes(d) && 'is-on')}
                  onClick={() => setDays((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))}
                >
                  {WEEKDAYS_SHORT[d]}
                </button>
              ))}
            </div>
          )}
          {kind === 'interval' && (
            <div className="interval-row">
              <label htmlFor={`${id}-every`}>A cada</label>
              <Input
                id={`${id}-every`}
                type="number"
                min={2}
                max={365}
                value={every}
                onChange={(e) => setEvery(Number(e.target.value))}
                className="input--narrow"
              />
              <span>dias, a partir da data de início</span>
            </div>
          )}
          <p className="field__hint">{describeFrequency(frequency)}</p>
        </fieldset>

        <div className="form__grid form__grid--3">
          <Field label="Horário" htmlFor={`${id}-t`} hint="Opcional">
            <Input id={`${id}-t`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Início" htmlFor={`${id}-s`}>
            <Input id={`${id}-s`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value || todayISO())} />
          </Field>
          <Field label="Prioridade" htmlFor={`${id}-p`}>
            <Select id={`${id}-p`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="fieldset">
          <legend className="field__label">Etapas</legend>
          {steps.length > 0 && (
            <ol className="step-editor">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <span className="step-editor__n mono">{i + 1}</span>
                  <Input
                    value={s.title}
                    aria-label={`Etapa ${i + 1}`}
                    onChange={(e) => setSteps((all) => all.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                  />
                  <Button variant="ghost" size="sm" iconOnly icon={ArrowUp} aria-label="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)} />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={ArrowDown}
                    aria-label="Mover para baixo"
                    disabled={i === steps.length - 1}
                    onClick={() => move(i, 1)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={Trash2}
                    aria-label={`Remover etapa ${i + 1}`}
                    onClick={() => setSteps((all) => all.filter((x) => x.id !== s.id))}
                  />
                </li>
              ))}
            </ol>
          )}
          <div className="inline-add inline-add--boxed">
            <Plus size={15} aria-hidden />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={steps.length ? 'Adicionar etapa e pressionar Enter' : 'Sem etapas: a execução é marcada de uma vez. Adicione uma etapa…'}
              aria-label="Nova etapa"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (draft.trim()) setSteps((s) => [...s, { id: uid(), title: draft.trim() }])
                  setDraft('')
                }
              }}
            />
          </div>
        </fieldset>
      </form>
    </Dialog>
  )
}
