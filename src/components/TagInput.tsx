import { useId, useState } from 'react'
import { X } from 'lucide-react'

/** Campo de etiquetas livres (ex.: plataformas). Enter ou vírgula adicionam. */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  label,
}: {
  value: string[]
  onChange: (v: string[]) => void
  suggestions?: string[]
  placeholder?: string
  label: string
}) {
  const [draft, setDraft] = useState('')
  const listId = useId()
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, '')
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase())) return setDraft('')
    onChange([...value, v])
    setDraft('')
  }
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
  return (
    <div className="tags-input">
      {value.map((t) => (
        <span key={t} className="tag">
          {t}
          <button type="button" aria-label={`Remover ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
      <input
        aria-label={label}
        value={draft}
        list={remaining.length ? listId : undefined}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(draft)
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => draft && add(draft)}
      />
      {remaining.length > 0 && (
        <datalist id={listId}>
          {remaining.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  )
}
