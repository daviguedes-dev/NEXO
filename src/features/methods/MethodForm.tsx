import { useEffect, useId, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Method, MethodStep } from '../../db/types'
import { uid, entityKey } from '../../lib/ids'
import { createMethod, updateMethod } from '../../db/methods'
import { Dialog } from '../../components/Dialog'
import { Markdown } from '../../components/Markdown'
import { useToast } from '../../components/feedback'
import { Button, Field, Input, Segmented, TextArea } from '../../components/ui'

const blankStep = (): MethodStep => ({ id: uid(), title: '', description: '', checklist: [] })

export function MethodForm({
  method,
  open,
  onClose,
  categories,
  onSaved,
}: {
  method?: Method
  open: boolean
  onClose: () => void
  categories: string[]
  onSaved?: (m: Method) => void
}) {
  const id = useId()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [summary, setSummary] = useState('')
  const [doc, setDoc] = useState('')
  const [docMode, setDocMode] = useState<'edit' | 'preview'>('edit')
  const [steps, setSteps] = useState<MethodStep[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(method?.title ?? '')
    setCategory(method?.category ?? '')
    setSummary(method?.summary ?? '')
    setDoc(method?.documentation ?? '')
    setSteps(method?.steps.length ? method.steps : [blankStep()])
    setDocMode('edit')
  }, [open, method])

  const patchStep = (sid: string, p: Partial<MethodStep>) => setSteps((all) => all.map((s) => (s.id === sid ? { ...s, ...p } : s)))
  const moveStep = (i: number, dir: -1 | 1) =>
    setSteps((s) => {
      const out = [...s]
      ;[out[i], out[i + dir]] = [out[i + dir], out[i]]
      return out
    })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const clean = steps
      .filter((s) => s.title.trim() || s.checklist.length)
      .map((s) => ({ ...s, title: s.title.trim() || 'Etapa', checklist: s.checklist.filter((c) => c.text.trim()) }))
    const data = { title: title.trim(), category: category.trim(), summary, documentation: doc, steps: clean }
    if (method) {
      await updateMethod(method.id, data)
      toast('Método salvo — execuções existentes não mudam')
      onSaved?.({ ...method, ...data })
    } else {
      const m = await createMethod(data)
      toast(`${entityKey('method', m.number)} criado`)
      onSaved?.(m)
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={method ? `Editar ${entityKey('method', method.number)}` : 'Novo método de trabalho'}
      footer={
        <>
          {method && <span className="muted dialog__foot-note">Mudanças em etapas ou documentação geram a versão v{method.version + 1}.</span>}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form={`${id}-f`} disabled={!title.trim()}>
            Salvar método
          </Button>
        </>
      }
    >
      <form id={`${id}-f`} className="form" onSubmit={submit}>
        <div className="form__grid form__grid--wide-first">
          <Field label="Título" htmlFor={`${id}-t`}>
            <Input id={`${id}-t`} autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Fechamento financeiro mensal" />
          </Field>
          <Field label="Categoria" htmlFor={`${id}-c`}>
            <Input id={`${id}-c`} list={`${id}-cats`} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Finanças" />
            <datalist id={`${id}-cats`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Resumo" htmlFor={`${id}-s`}>
          <Input id={`${id}-s`} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Uma frase sobre quando e por que usar" />
        </Field>

        <div className="field">
          <div className="field__label-row">
            <label className="field__label" htmlFor={`${id}-doc`}>
              Documentação
            </label>
            <Segmented
              label="Modo da documentação"
              value={docMode}
              onChange={setDocMode}
              options={[
                { id: 'edit', label: 'Escrever', icon: Pencil },
                { id: 'preview', label: 'Visualizar', icon: Eye },
              ]}
            />
          </div>
          {docMode === 'edit' ? (
            <TextArea
              id={`${id}-doc`}
              rows={6}
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              className="textarea--code"
              placeholder={'## Quando usar\n\n## Resultado esperado\n- …'}
            />
          ) : (
            <div className="doc-preview">{doc.trim() ? <Markdown source={doc} /> : <p className="muted">Nada escrito ainda.</p>}</div>
          )}
          <p className="field__hint">Aceita Markdown simples: # títulos, - listas, **negrito**, *itálico*, `código`, [links](https://…).</p>
        </div>

        <fieldset className="fieldset">
          <legend className="field__label">Etapas e checklists</legend>
          <ol className="method-steps-editor">
            {steps.map((s, i) => (
              <li key={s.id} className="mstep-edit">
                <div className="mstep-edit__head">
                  <span className="step-editor__n mono">{String(i + 1).padStart(2, '0')}</span>
                  <Input
                    value={s.title}
                    aria-label={`Título da etapa ${i + 1}`}
                    placeholder="Nome da etapa"
                    onChange={(e) => patchStep(s.id, { title: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={ArrowUp}
                    aria-label="Mover etapa para cima"
                    disabled={i === 0}
                    onClick={() => moveStep(i, -1)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={ArrowDown}
                    aria-label="Mover etapa para baixo"
                    disabled={i === steps.length - 1}
                    onClick={() => moveStep(i, 1)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={Trash2}
                    aria-label={`Remover etapa ${i + 1}`}
                    onClick={() => setSteps((all) => all.filter((x) => x.id !== s.id))}
                  />
                </div>
                <Input
                  value={s.description}
                  aria-label={`Descrição da etapa ${i + 1}`}
                  placeholder="Descrição (opcional)"
                  onChange={(e) => patchStep(s.id, { description: e.target.value })}
                  className="mstep-edit__desc"
                />
                <ul className="mstep-edit__checklist">
                  {s.checklist.map((c) => (
                    <li key={c.id}>
                      <span className="md-box" aria-hidden />
                      <input
                        value={c.text}
                        aria-label="Item do checklist"
                        onChange={(e) => patchStep(s.id, { checklist: s.checklist.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)) })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={X}
                        aria-label="Remover item"
                        onClick={() => patchStep(s.id, { checklist: s.checklist.filter((x) => x.id !== c.id) })}
                      />
                    </li>
                  ))}
                  <li className="inline-add">
                    <Plus size={14} aria-hidden />
                    <input
                      placeholder="Item do checklist + Enter"
                      aria-label={`Novo item na etapa ${i + 1}`}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        const v = (e.target as HTMLInputElement).value.trim()
                        if (!v) return
                        patchStep(s.id, { checklist: [...s.checklist, { id: uid(), text: v }] })
                        ;(e.target as HTMLInputElement).value = ''
                      }}
                    />
                  </li>
                </ul>
              </li>
            ))}
          </ol>
          <Button size="sm" icon={Plus} onClick={() => setSteps((s) => [...s, blankStep()])}>
            Adicionar etapa
          </Button>
        </fieldset>
      </form>
    </Dialog>
  )
}
