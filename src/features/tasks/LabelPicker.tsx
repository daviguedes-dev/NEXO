import { useState } from 'react'
import { Plus, Tag } from 'lucide-react'
import type { ID, Label } from '../../db/types'
import { SWATCHES } from '../../lib/meta'
import { createLabel } from '../../db/tasks'
import { Button, Input, Swatches, cx } from '../../components/ui'

/** Seleção de etiquetas por alternância, com criação rápida. */
export function LabelPicker({ labels, value, onChange }: { labels: Label[]; value: ID[]; onChange: (v: ID[]) => void }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[1])

  const submit = async () => {
    const n = name.trim()
    if (!n) return
    const existing = labels.find((l) => l.name.toLowerCase() === n.toLowerCase())
    const label = existing ?? (await createLabel(n, color))
    if (!value.includes(label.id)) onChange([...value, label.id])
    setName('')
    setCreating(false)
  }

  return (
    <div className="label-picker">
      <div className="label-picker__list" role="group" aria-label="Etiquetas">
        {labels.map((l) => {
          const on = value.includes(l.id)
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={on}
              className={cx('chip chip--toggle', on && 'is-on')}
              style={{ ['--c' as string]: l.color }}
              onClick={() => onChange(on ? value.filter((x) => x !== l.id) : [...value, l.id])}
            >
              <span className="chip__dot" aria-hidden />
              {l.name}
            </button>
          )
        })}
        {!creating && (
          <button type="button" className="chip chip--add" onClick={() => setCreating(true)}>
            <Plus size={12} aria-hidden /> Nova etiqueta
          </button>
        )}
      </div>
      {labels.length === 0 && !creating && (
        <p className="field__hint">
          <Tag size={12} aria-hidden /> Etiquetas ajudam a agrupar tarefas por contexto.
        </p>
      )}
      {creating && (
        <div className="label-picker__new">
          <Input
            autoFocus
            value={name}
            placeholder="Nome da etiqueta"
            aria-label="Nome da nova etiqueta"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void submit()
              }
              if (e.key === 'Escape') {
                e.stopPropagation()
                e.preventDefault()
                setCreating(false)
              }
            }}
          />
          <Swatches value={color} onChange={setColor} colors={SWATCHES} label="Cor da etiqueta" />
          <div className="label-picker__actions">
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="primary" onClick={() => void submit()} disabled={!name.trim()}>
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
