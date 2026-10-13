import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from './ui'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Linha discreta acima do título, ex.: a referência TSK-12 */
  eyebrow?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** `modal` centralizado ou `sheet` lateral (painel de detalhes). */
  variant?: 'modal' | 'sheet'
  size?: 'sm' | 'md' | 'lg'
  headerActions?: ReactNode
}

/** Diálogo acessível baseado em <dialog>: foco preso, Esc e clique fora fecham. */
export function Dialog({ open, onClose, title, eyebrow, children, footer, variant = 'modal', size = 'md', headerActions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx('dialog', `dialog--${variant}`, `dialog--${size}`)}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="dialog__frame">
          <header className="dialog__head">
            <div className="dialog__titles">
              {eyebrow && <div className="dialog__eyebrow">{eyebrow}</div>}
              <h2 id={titleId} className="dialog__title">
                {title}
              </h2>
            </div>
            <div className="dialog__head-actions">
              {headerActions}
              <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={onClose} aria-label="Fechar" autoFocus={variant === 'sheet'}>
                <X size={16} aria-hidden />
              </button>
            </div>
          </header>
          <div className="dialog__body">{children}</div>
          {footer && <footer className="dialog__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
