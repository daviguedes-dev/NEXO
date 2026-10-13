import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Menu as MenuIcon, Plus, Search, Settings, X } from 'lucide-react'
import { db } from '../../db/database'
import { todayISO } from '../../lib/dates'
import { isScheduled } from '../../lib/recurrence'
import { Menu } from '../../components/Menu'
import { NexoMark } from '../../components/icons'
import { Kbd, cx } from '../../components/ui'
import { AccountMenu } from './AccountMenu'
import { CommandPalette } from './CommandPalette'
import { LocalImportPrompt } from './LocalImportPrompt'
import { ThemeSwitch } from './ThemeSwitch'
import { CREATE, NAV } from './nav'

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

export function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // fecha o menu móvel ao navegar
  useEffect(() => setNavOpen(false), [location.pathname, location.search])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return
      if (e.key === 'c') {
        e.preventDefault()
        navigate('/tarefas?nova=1')
      } else if (e.key === '/') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const today = todayISO()
  const counts = useLiveQuery(async () => {
    const open = await db.tasks.where('status').notEqual('done').count()
    const routines = (await db.routines.toArray()).filter((r) => !r.archived && isScheduled(r, today))
    const logs = await db.routineLogs.where('date').equals(today).toArray()
    const doneIds = new Set(logs.filter((l) => l.status === 'done').map((l) => l.routineId))
    const pendingRoutines = routines.filter((r) => !doneIds.has(r.id)).length
    const activeRuns = await db.methodRuns.where('status').equals('active').count()
    const scheduled = await db.posts.where('status').anyOf('scheduled', 'review', 'production').count()
    return { '/tarefas': open, '/rotinas': pendingRoutines, '/metodos': activeRuns, '/publicacoes': scheduled } as Record<string, number>
  }, [today])

  let lastGroup: string | undefined
  return (
    <div className={cx('shell', navOpen && 'nav-open')}>
      <a className="skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="topbar">
        <button
          type="button"
          className="btn btn--ghost btn--icon topbar__btn"
          aria-label="Abrir navegação"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <MenuIcon size={18} aria-hidden />
        </button>
        <NavLink to="/" className="brand brand--topbar" aria-label="nexo — ir para a visão geral">
          <NexoMark size={26} />
          <span className="brand__name">nexo</span>
        </NavLink>
        <button type="button" className="btn btn--ghost btn--icon topbar__btn" aria-label="Buscar" onClick={() => setPaletteOpen(true)}>
          <Search size={18} aria-hidden />
        </button>
      </header>

      <aside className="sidebar" aria-label="Navegação principal">
        <div className="sidebar__top">
          <NavLink to="/" className="brand">
            <NexoMark size={30} />
            <span className="brand__text">
              <span className="brand__name">nexo</span>
              <span className="brand__tag mono">organização operacional</span>
            </span>
            <span className="sr-only"> — visão geral</span>
          </NavLink>
          <button type="button" className="btn btn--ghost btn--icon sidebar__close" aria-label="Fechar navegação" onClick={() => setNavOpen(false)}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="sidebar__actions">
          <Menu
            label="Criar novo registro"
            triggerClassName="btn btn--primary btn--md sidebar__new"
            trigger={
              <>
                <Plus size={16} aria-hidden /> Novo
              </>
            }
            heading="Criar"
            items={CREATE.map((c) => ({
              id: c.id,
              label: c.label,
              icon: <c.icon size={15} aria-hidden />,
              hint: 'key' in c ? <Kbd>{c.key}</Kbd> : undefined,
              onSelect: () => navigate(c.to),
            }))}
          />
          <button type="button" className="sidebar__search" onClick={() => setPaletteOpen(true)}>
            <Search size={15} aria-hidden />
            <span>Buscar</span>
            <Kbd>Ctrl K</Kbd>
          </button>
        </div>

        <nav className="sidebar__nav">
          <ul>
            {NAV.map((item) => {
              const group = 'group' in item ? item.group : undefined
              const heading = group && group !== lastGroup ? group : null
              lastGroup = group
              const count = counts?.[item.to]
              return (
                <li key={item.to}>
                  {heading && <p className="sidebar__group">{heading}</p>}
                  <NavLink to={item.to} end={'end' in item} className={({ isActive }) => cx('navlink', isActive && 'is-active')}>
                    <item.icon size={17} strokeWidth={1.9} aria-hidden />
                    <span>{item.label}</span>
                    {!!count && (
                      <span className="navlink__count mono" aria-label={`${count} pendentes`}>
                        {count}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="sidebar__bottom">
          <div className="sidebar__prefs">
            <NavLink to="/configuracoes" className={({ isActive }) => cx('navlink', isActive && 'is-active')}>
              <Settings size={17} strokeWidth={1.9} aria-hidden />
              <span>Configurações</span>
            </NavLink>
            <ThemeSwitch />
          </div>
          <AccountMenu />
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden />

      <main id="conteudo" className="main" tabIndex={-1}>
        <Outlet />
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <LocalImportPrompt />
    </div>
  )
}
