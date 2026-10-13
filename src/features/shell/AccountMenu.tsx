import { useNavigate } from 'react-router-dom'
import { Cloud, CloudOff, HardDrive, LogIn, LogOut, RefreshCw, Settings, TriangleAlert } from 'lucide-react'
import { useSyncStatus, syncNow, type SyncStatus } from '../../sync/engine'
import { timeAgo } from '../../lib/dates'
import { Menu } from '../../components/Menu'
import { useConfirm, useToast } from '../../components/feedback'
import { displayName, useAuth } from '../auth/AuthProvider'

export function syncLabel(s: SyncStatus): { text: string; icon: typeof Cloud; tone: 'ok' | 'busy' | 'warn' } {
  if (s.state === 'syncing') return { text: 'Sincronizando…', icon: RefreshCw, tone: 'busy' }
  if (s.state === 'offline') return { text: s.pending ? `Offline · ${s.pending} pendente${s.pending > 1 ? 's' : ''}` : 'Offline', icon: CloudOff, tone: 'warn' }
  if (s.state === 'error') return { text: 'Erro ao sincronizar', icon: TriangleAlert, tone: 'warn' }
  if (s.pending) return { text: `${s.pending} alteraç${s.pending > 1 ? 'ões' : 'ão'} a enviar`, icon: RefreshCw, tone: 'busy' }
  return { text: s.lastSyncedAt ? `Sincronizado ${timeAgo(s.lastSyncedAt)}` : 'Conectado', icon: Cloud, tone: 'ok' }
}

/** Bloco da conta no rodapé da barra lateral: quem está conectado, estado da sincronização e ações. */
export function AccountMenu() {
  const { state, signOut, leaveLocalMode } = useAuth()
  const status = useSyncStatus()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  if (state.status !== 'ready') return null

  if (state.mode === 'local') {
    return (
      <Menu
        label="Conta"
        textTrigger
        align="start"
        triggerClassName="account"
        trigger={
          <>
            <span className="account__avatar account__avatar--local" aria-hidden>
              <HardDrive size={15} />
            </span>
            <span className="account__text">
              <span className="sr-only">Conta: </span>
              <span className="account__name">Sem conta</span>
              <span className="account__sync">Somente neste aparelho</span>
            </span>
          </>
        }
        items={[
          { id: 'login', label: 'Entrar ou criar conta', icon: <LogIn size={14} aria-hidden />, onSelect: leaveLocalMode },
          { id: 'settings', label: 'Configurações', icon: <Settings size={14} aria-hidden />, onSelect: () => navigate('/configuracoes') },
        ]}
      />
    )
  }

  const name = displayName(state.user)
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  const sync = syncLabel(status)

  const doSignOut = async () => {
    if (status.pending > 0) {
      const ok = await confirm({
        title: 'Sair com alterações pendentes?',
        message: `${status.pending} alteração(ões) ainda não chegaram à nuvem. Elas ficam guardadas neste aparelho e serão enviadas no próximo login.`,
        confirmLabel: 'Sair mesmo assim',
      })
      if (!ok) return
    }
    await signOut()
    toast('Você saiu da conta')
  }

  return (
    <Menu
      label="Conta"
      textTrigger
      align="start"
      triggerClassName="account"
      trigger={
        <>
          <span className="account__avatar" aria-hidden>
            {initials || '?'}
          </span>
          <span className="account__text">
            <span className="sr-only">Conta: </span>
            <span className="account__name">{name}</span>
            <span className={`account__sync account__sync--${sync.tone}`}>
              <sync.icon size={12} aria-hidden className={sync.tone === 'busy' ? 'spin' : undefined} />
              {sync.text}
            </span>
          </span>
        </>
      }
      items={[
        {
          id: 'sync',
          label: 'Sincronizar agora',
          icon: <RefreshCw size={14} aria-hidden />,
          onSelect: () => void syncNow(),
        },
        { id: 'settings', label: 'Conta e configurações', icon: <Settings size={14} aria-hidden />, onSelect: () => navigate('/configuracoes') },
        { id: 'logout', label: 'Sair', icon: <LogOut size={14} aria-hidden />, danger: true, onSelect: doSignOut },
      ]}
    />
  )
}
