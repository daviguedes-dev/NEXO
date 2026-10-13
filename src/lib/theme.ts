import { useSyncExternalStore } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'nexo:theme'
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
const listeners = new Set<() => void>()

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* armazenamento indisponível */
  }
  return 'system'
}

let pref: ThemePref = read()

export function resolveTheme(p: ThemePref = pref): 'light' | 'dark' {
  return p === 'system' ? (media?.matches ? 'dark' : 'light') : p
}

/** Aplica o tema no <html> (o index.html faz o mesmo antes da primeira pintura). */
export function applyTheme() {
  const resolved = resolveTheme()
  document.documentElement.dataset.theme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#070b15' : '#0B1220')
}

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* segue só na sessão atual */
  }
  applyTheme()
  listeners.forEach((l) => l())
}

media?.addEventListener('change', () => {
  if (pref === 'system') {
    applyTheme()
    listeners.forEach((l) => l())
  }
})

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useTheme(): { pref: ThemePref; resolved: 'light' | 'dark' } {
  const p = useSyncExternalStore(subscribe, () => pref)
  return { pref: p, resolved: resolveTheme(p) }
}
