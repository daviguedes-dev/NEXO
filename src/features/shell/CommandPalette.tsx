import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react'
import { db } from '../../db/database'
import { entityKey } from '../../lib/ids'
import { StatusIcon } from '../../components/icons'
import { cx } from '../../components/ui'
import { CREATE, NAV } from './nav'

interface Item {
  id: string
  group: string
  label: string
  meta?: ReactNode
  icon?: ReactNode
  keywords: string
  to: string
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Busca global (Ctrl+K): registros por título ou referência, telas e ações de criação. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      setQ('')
      setActive(0)
      requestAnimationFrame(() => input.current?.focus())
    }
    if (!open && d.open) d.close()
  }, [open])

  const records = useLiveQuery(async () => {
    if (!open) return []
    const [tasks, routines, methods, runs, posts, templates, projects] = await Promise.all([
      db.tasks.toArray(),
      db.routines.toArray(),
      db.methods.toArray(),
      db.methodRuns.toArray(),
      db.posts.toArray(),
      db.templates.toArray(),
      db.projects.toArray(),
    ])
    const items: Item[] = []
    for (const t of tasks) {
      const k = entityKey('task', t.number)
      items.push({
        id: t.id,
        group: 'Tarefas',
        label: t.title,
        meta: k,
        icon: <StatusIcon status={t.status} size={15} />,
        keywords: `${k} ${t.title}`,
        to: `/tarefas/${t.number}`,
      })
    }
    for (const r of routines) {
      const k = entityKey('routine', r.number)
      items.push({ id: r.id, group: 'Rotinas', label: r.name, meta: k, keywords: `${k} ${r.name}`, to: `/rotinas/${r.number}` })
    }
    for (const m of methods) {
      const k = entityKey('method', m.number)
      items.push({ id: m.id, group: 'Métodos', label: m.title, meta: k, keywords: `${k} ${m.title} ${m.category}`, to: `/metodos/${m.number}` })
    }
    for (const r of runs) {
      const k = entityKey('run', r.number)
      items.push({ id: r.id, group: 'Execuções', label: r.title, meta: k, keywords: `${k} ${r.title}`, to: `/metodos/execucoes/${r.number}` })
    }
    for (const p of posts) {
      const k = entityKey('post', p.number)
      items.push({
        id: p.id,
        group: 'Publicações',
        label: p.title,
        meta: k,
        keywords: `${k} ${p.title} ${p.platforms.join(' ')}`,
        to: `/publicacoes/${p.number}`,
      })
    }
    for (const t of templates) {
      const k = entityKey('template', t.number)
      items.push({ id: t.id, group: 'Modelos', label: t.name, meta: k, keywords: `${k} ${t.name}`, to: `/publicacoes/modelos/${t.number}` })
    }
    for (const p of projects) {
      const k = entityKey('project', p.number)
      items.push({ id: p.id, group: 'Projetos', label: p.name, meta: k, keywords: `${k} ${p.name}`, to: `/tarefas?projeto=${p.id}` })
    }
    return items
  }, [open])

  const results = useMemo(() => {
    const nq = normalize(q.trim())
    const nav: Item[] = [
      ...CREATE.map((c) => ({ id: `create-${c.id}`, group: 'Criar', label: c.label, icon: <c.icon size={15} aria-hidden />, keywords: c.label, to: c.to })),
      ...NAV.map((n) => ({ id: `nav-${n.to}`, group: 'Ir para', label: n.label, icon: <n.icon size={15} aria-hidden />, keywords: n.label, to: n.to })),
      { id: 'nav-settings', group: 'Ir para', label: 'Configurações e backup', keywords: 'configurações backup exportar importar', to: '/configuracoes' },
    ]
    if (!nq) return [...nav.filter((i) => i.group === 'Criar').slice(0, 3), ...nav.filter((i) => i.group === 'Ir para')]
    const match = (i: Item) => normalize(i.keywords).includes(nq)
    // referência exata primeiro, depois títulos que começam com o termo
    const score = (i: Item) => {
      const key = typeof i.meta === 'string' ? normalize(i.meta) : ''
      if (key === nq) return 0
      if (normalize(i.label).startsWith(nq)) return 1
      if (key.startsWith(nq)) return 2
      return 3
    }
    const found = (records ?? []).filter(match).sort((a, b) => score(a) - score(b))
    return [...found.slice(0, 30), ...nav.filter(match)]
  }, [q, records])

  useEffect(() => setActive(0), [q])

  const go = (item: Item | undefined) => {
    if (!item) return
    onClose()
    navigate(item.to)
  }

  let lastGroup = ''
  return (
    <dialog
      ref={ref}
      className="dialog palette"
      aria-label="Busca e comandos"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && (
        <div className="palette__frame">
          <div className="palette__input">
            <Search size={17} aria-hidden />
            <input
              ref={input}
              value={q}
              placeholder="Buscar tarefas, rotinas, métodos, publicações ou TSK-12…"
              aria-label="Buscar"
              role="combobox"
              aria-expanded
              aria-controls="palette-list"
              aria-activedescendant={results[active] ? `pi-${results[active].id}` : undefined}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive((a) => Math.min(results.length - 1, a + 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((a) => Math.max(0, a - 1))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  go(results[active])
                }
              }}
            />
            <kbd className="kbd">Esc</kbd>
          </div>
          <ul className="palette__list" id="palette-list" role="listbox" aria-label="Resultados">
            {results.length === 0 && <li className="palette__empty">Nada encontrado para “{q}”.</li>}
            {results.map((item, i) => {
              const head = item.group !== lastGroup ? item.group : null
              lastGroup = item.group
              return (
                <li key={item.id} role="presentation">
                  {head && <p className="palette__group">{head}</p>}
                  <div
                    id={`pi-${item.id}`}
                    role="option"
                    aria-selected={i === active}
                    className={cx('palette__item', i === active && 'is-active')}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(item)}
                  >
                    <span className="palette__icon">{item.icon ?? <ArrowRight size={15} aria-hidden />}</span>
                    <span className="palette__label">{item.label}</span>
                    {item.meta && <span className="ref mono">{item.meta}</span>}
                    {i === active && <CornerDownLeft size={14} className="palette__enter" aria-hidden />}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </dialog>
  )
}
