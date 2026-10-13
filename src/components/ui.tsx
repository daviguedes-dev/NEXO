import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

/* ---------------------------------------------------------------- botões */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  /** Botão só com ícone: exige `aria-label`. */
  iconOnly?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconOnly, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx('btn', `btn--${variant}`, `btn--${size}`, iconOnly && 'btn--icon', className)} {...rest}>
      {Icon && <Icon aria-hidden size={size === 'sm' ? 15 : 16} strokeWidth={2} />}
      {children}
    </button>
  )
})

interface LinkButtonProps extends LinkProps {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
}

export function LinkButton({ variant = 'secondary', size = 'md', icon: Icon, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={cx('btn', `btn--${variant}`, `btn--${size}`, className)} {...rest}>
      {Icon && <Icon aria-hidden size={size === 'sm' ? 15 : 16} strokeWidth={2} />}
      {children}
    </Link>
  )
}

/* ---------------------------------------------------------- formulários */

export function Field({ label, hint, htmlFor, children, className }: { label: ReactNode; hint?: ReactNode; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('field', className)}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx('input', className)} {...rest} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx('input', 'textarea', className)} {...rest} />
})

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cx('select', className)}>
      <select {...rest}>{children}</select>
    </span>
  )
}

export function Checkbox({ checked, onChange, label, className, disabled }: { checked: boolean; onChange: () => void; label: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <label className={cx('check', checked && 'is-checked', disabled && 'is-disabled', className)}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <span className="check__box" aria-hidden>
        <svg viewBox="0 0 16 16">
          <path d="M3.5 8.4l2.9 2.9 6-6.4" />
        </svg>
      </span>
      <span className="check__label">{label}</span>
    </label>
  )
}

/* ---------------------------------------------------------- estrutura */

export function Panel({ title, count, actions, children, className, bodyClassName, id }: { title?: ReactNode; count?: number; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; id?: string }) {
  return (
    <section className={cx('panel', className)} aria-labelledby={title && id ? `${id}-t` : undefined}>
      {(title || actions) && (
        <header className="panel__head">
          {title && (
            <h2 className="panel__title" id={id ? `${id}-t` : undefined}>
              {title}
              {count !== undefined && <span className="count mono">{count}</span>}
            </h2>
          )}
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      <div className={cx('panel__body', bodyClassName)}>{children}</div>
    </section>
  )
}

export function PageHeader({ section, title, description, actions }: { section: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <p className="page-head__crumb mono">
          nexo <span aria-hidden>/</span> {section}
        </p>
        <h1 className="page-head__title">{title}</h1>
        {description && <p className="page-head__desc">{description}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  )
}

export function EmptyState({ icon: Icon, title, children, action, compact }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cx('empty', compact && 'empty--compact')}>
      <span className="empty__icon" aria-hidden>
        <Icon size={compact ? 18 : 22} strokeWidth={1.75} />
      </span>
      <p className="empty__title">{title}</p>
      {children && <div className="empty__text">{children}</div>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

export function Ref({ children }: { children: ReactNode }) {
  return <span className="ref mono">{children}</span>
}

export function ProgressBar({ value, total, label, tone = 'teal' }: { value: number; total: number; label?: string; tone?: 'teal' | 'navy' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <span className={cx('bar', `bar--${tone}`)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label ?? `${pct}% concluído`}>
      <span className="bar__fill" style={{ width: `${pct}%` }} />
    </span>
  )
}

export function ProgressRing({ value, total, size = 44, stroke = 4, children }: { value: number; total: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? value / total : 0
  return (
    <span className="ring" style={{ width: size, height: size }} role="img" aria-label={`${value} de ${total} concluídas`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--teal)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .5s var(--ease)' }}
        />
      </svg>
      {children && <span className="ring__label">{children}</span>}
    </span>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; icon?: LucideIcon }[]; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(({ id, label: l, icon: Icon }) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} className={cx('seg__item', value === id && 'is-active')} onClick={() => onChange(id)}>
          {Icon && <Icon aria-hidden size={15} />}
          <span>{l}</span>
        </button>
      ))}
    </div>
  )
}

export function Swatches({ value, onChange, colors, label }: { value: string; onChange: (c: string) => void; colors: string[]; label: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} className={cx('swatch', value === c && 'is-active')} style={{ ['--c' as string]: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  )
}
