import { Monitor, Moon, Sun } from 'lucide-react'
import { setThemePref, useTheme, type ThemePref } from '../../lib/theme'
import { cx } from '../../components/ui'

const OPTIONS: { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Tema claro', icon: Sun },
  { id: 'dark', label: 'Tema escuro', icon: Moon },
  { id: 'system', label: 'Tema do sistema', icon: Monitor },
]

/** Alternância compacta claro / escuro / sistema. */
export function ThemeSwitch({ withLabels }: { withLabels?: boolean }) {
  const { pref } = useTheme()
  return (
    <div className={cx('theme-switch', withLabels && 'theme-switch--labels')} role="radiogroup" aria-label="Tema">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={pref === id}
          aria-label={withLabels ? undefined : label}
          title={label}
          className={cx('theme-switch__opt', pref === id && 'is-active')}
          onClick={() => setThemePref(id)}
        >
          <Icon size={15} aria-hidden />
          {withLabels && <span>{label.replace('Tema ', '').replace(/^./, (c) => c.toUpperCase())}</span>}
        </button>
      ))}
    </div>
  )
}
