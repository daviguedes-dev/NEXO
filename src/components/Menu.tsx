import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cx } from './ui'

export interface MenuItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  hint?: ReactNode
  selected?: boolean
  danger?: boolean
  onSelect: () => void
}

interface MenuProps {
  /** Conteúdo do botão que abre o menu. */
  trigger: ReactNode
  label: string
  items: MenuItem[]
  align?: 'start' | 'end'
  triggerClassName?: string
  heading?: string
  /** O texto visível do gatilho já nomeia o botão (não usar aria-label). */
  textTrigger?: boolean
}

/** Menu suspenso com navegação por setas, Esc e clique fora. */
export function Menu({ trigger, label, items, align = 'start', triggerClassName, heading, textTrigger }: MenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    const first = list.current?.querySelector<HTMLButtonElement>('[aria-checked="true"], [role^="menuitem"]')
    first?.focus()
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const onKey = (e: React.KeyboardEvent) => {
    const els = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? [])
    const i = els.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      els[(i + 1) % els.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      els[(i - 1 + els.length) % els.length]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      btn.current?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const hasSelection = items.some((i) => i.selected !== undefined)

  return (
    <div className="menu" ref={root} onKeyDown={open ? onKey : undefined}>
      <button
        ref={btn}
        type="button"
        className={cx('menu__trigger', triggerClassName)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={textTrigger ? undefined : label}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        {trigger}
      </button>
      {open && (
        <div className={cx('menu__list', `menu__list--${align}`)} role="menu" id={id} ref={list} aria-label={label}>
          {heading && <p className="menu__heading">{heading}</p>}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role={hasSelection ? 'menuitemradio' : 'menuitem'}
              aria-checked={hasSelection ? !!item.selected : undefined}
              className={cx('menu__item', item.danger && 'is-danger', item.selected && 'is-selected')}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                btn.current?.focus()
                item.onSelect()
              }}
            >
              {item.icon && <span className="menu__icon">{item.icon}</span>}
              <span className="menu__label">{item.label}</span>
              {item.hint && <span className="menu__hint">{item.hint}</span>}
              {item.selected && <Check size={14} className="menu__check" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
