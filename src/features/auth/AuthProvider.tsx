import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import Dexie from 'dexie'
import { selectDatabase } from '../../db/database'
import { supabase } from '../../lib/supabase'
import { getSyncStatus, startSync, syncNow } from '../../sync/engine'
import { supabaseRemote } from '../../sync/remote'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'recovery'; user: User }
  | { status: 'ready'; mode: 'cloud'; user: User }
  | { status: 'ready'; mode: 'local' }

interface AuthApi {
  state: AuthState
  /** Nome do banco local em uso (muda ao trocar de conta). */
  dbName: string | null
  enterLocalMode: () => void
  leaveLocalMode: () => void
  signOut: (opts?: { wipeDevice?: boolean }) => Promise<void>
  finishRecovery: () => void
}

const AuthCtx = createContext<AuthApi | null>(null)
export function useAuth(): AuthApi {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

const MODE_KEY = 'nexo:mode'
const readLocalMode = () => {
  try {
    return localStorage.getItem(MODE_KEY) === 'local'
  } catch {
    return false
  }
}
const writeLocalMode = (on: boolean) => {
  try {
    if (on) localStorage.setItem(MODE_KEY, 'local')
    else localStorage.removeItem(MODE_KEY)
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

export function displayName(user: User): string {
  const meta = user.user_metadata as { name?: string } | undefined
  return meta?.name?.trim() || user.email?.split('@')[0] || 'Conta'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    // Não chamar outras funções do supabase com await dentro deste callback (pode travar o cliente).
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setState({ status: 'recovery', user: session.user })
        return
      }
      if (session?.user) {
        writeLocalMode(false)
        setState((prev) => (prev.status === 'recovery' ? { status: 'recovery', user: session.user } : { status: 'ready', mode: 'cloud', user: session.user }))
        return
      }
      setState(readLocalMode() ? { status: 'ready', mode: 'local' } : { status: 'signedOut' })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const accountKey = state.status === 'ready' ? (state.mode === 'cloud' ? state.user.id : 'local') : null

  // Seleciona o banco antes de renderizar as telas (elas consultam `db` direto).
  const dbName = useMemo(() => (accountKey ? selectDatabase(accountKey === 'local' ? 'local' : { userId: accountKey }).name : null), [accountKey])

  useEffect(() => {
    if (!accountKey || accountKey === 'local') return
    return startSync(supabaseRemote(supabase, accountKey))
  }, [accountKey])

  const enterLocalMode = useCallback(() => {
    writeLocalMode(true)
    setState({ status: 'ready', mode: 'local' })
  }, [])

  const leaveLocalMode = useCallback(() => {
    writeLocalMode(false)
    setState({ status: 'signedOut' })
  }, [])

  const signOut = useCallback(
    async (opts: { wipeDevice?: boolean } = {}) => {
      if (state.status !== 'ready' || state.mode !== 'cloud') return
      const name = `nexo-u-${state.user.id}`
      // última tentativa de enviar o que estiver pendente (sem travar a saída)
      await Promise.race([syncNow().catch(() => undefined), new Promise((r) => setTimeout(r, 6000))])
      await supabase.auth.signOut({ scope: 'local' })
      if (opts.wipeDevice && getSyncStatus().pending === 0) {
        selectDatabase('local')
        await Dexie.delete(name)
      }
    },
    [state],
  )

  const finishRecovery = useCallback(() => {
    setState((prev) => (prev.status === 'recovery' ? { status: 'ready', mode: 'cloud', user: prev.user } : prev))
  }, [])

  const api = useMemo<AuthApi>(
    () => ({ state, dbName, enterLocalMode, leaveLocalMode, signOut, finishRecovery }),
    [state, dbName, enterLocalMode, leaveLocalMode, signOut, finishRecovery],
  )
  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>
}
