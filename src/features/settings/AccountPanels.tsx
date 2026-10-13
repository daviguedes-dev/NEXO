import { useEffect, useId, useState, type FormEvent } from 'react'
import { CloudUpload, HardDrive, KeyRound, LogIn, LogOut, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/dates'
import { syncNow, useSyncStatus } from '../../sync/engine'
import { useConfirm, useToast } from '../../components/feedback'
import { Button, Field, Input, Panel } from '../../components/ui'
import { authMessage } from '../auth/authErrors'
import { displayName, useAuth } from '../auth/AuthProvider'
import { importLocalData, localDataSummary, type LocalSummary } from '../auth/importLocal'
import { syncLabel } from '../shell/AccountMenu'
import { ThemeSwitch } from '../shell/ThemeSwitch'

export function AppearancePanel() {
  return (
    <Panel title="Aparência">
      <p className="muted">Escolha o tema da interface. “Sistema” acompanha a configuração do seu aparelho.</p>
      <div className="settings__actions">
        <ThemeSwitch withLabels />
      </div>
    </Panel>
  )
}

export function AccountPanel() {
  const { state, signOut, leaveLocalMode } = useAuth()
  const status = useSyncStatus()
  const confirm = useConfirm()
  const toast = useToast()
  const id = useId()
  const user = state.status === 'ready' && state.mode === 'cloud' ? state.user : null
  const [name, setName] = useState(user ? displayName(user) : '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'' | 'name' | 'password' | 'import'>('')
  const [localSummary, setLocalSummary] = useState<LocalSummary | null>(null)

  useEffect(() => {
    if (user) void localDataSummary().then(setLocalSummary)
  }, [user])

  if (state.status !== 'ready') return null

  if (!user) {
    return (
      <Panel title="Conta">
        <div className="account-local">
          <HardDrive size={20} aria-hidden />
          <div>
            <p className="danger-row__title">Modo sem conta</p>
            <p className="muted small">
              Os dados ficam apenas neste navegador. Com uma conta, eles sincronizam entre seus aparelhos e ficam protegidos na nuvem.
            </p>
          </div>
          <Button variant="primary" icon={LogIn} onClick={leaveLocalMode}>
            Entrar ou criar conta
          </Button>
        </div>
      </Panel>
    )
  }

  const sync = syncLabel(status)

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    setBusy('name')
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } })
    setBusy('')
    toast(error ? authMessage(error) : 'Nome atualizado', { tone: error ? 'error' : 'ok' })
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    setBusy('password')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy('')
    if (!error) setPassword('')
    toast(error ? authMessage(error) : 'Senha alterada', { tone: error ? 'error' : 'ok' })
  }

  const doImport = async () => {
    if (!localSummary) return
    const ok = await confirm({
      title: 'Importar dados do modo sem conta?',
      message: `Serão adicionados à sua conta ${localSummary.total} registros principais deste navegador. Se a conta já tiver dados, os dois conjuntos ficam juntos (referências como TSK-3 podem se repetir).`,
      confirmLabel: 'Importar',
    })
    if (!ok) return
    setBusy('import')
    const n = await importLocalData()
    setBusy('')
    toast(`${n} registros importados`)
  }

  const leave = async (wipeDevice: boolean) => {
    const ok = await confirm({
      title: wipeDevice ? 'Sair e remover os dados deste aparelho?' : 'Sair da conta?',
      message: wipeDevice
        ? 'Tudo continua salvo na sua conta. Se ainda houver alterações não enviadas, os dados locais são mantidos para não perder nada.'
        : status.pending
          ? `${status.pending} alteração(ões) ainda não foram enviadas; elas ficam neste aparelho até o próximo login.`
          : 'Seus dados continuam na nuvem e neste aparelho.',
      confirmLabel: 'Sair',
      danger: wipeDevice,
    })
    if (!ok) return
    await signOut({ wipeDevice })
  }

  return (
    <Panel title="Conta">
      <dl className="kv">
        <dt>E-mail</dt>
        <dd>{user.email}</dd>
        <dt>Sincronização</dt>
        <dd className="account-sync">
          <span className={`account__sync account__sync--${sync.tone}`}>
            <sync.icon size={13} aria-hidden /> {sync.text}
          </span>
          {status.lastSyncedAt && <span className="muted small">última em {formatDateTime(status.lastSyncedAt)}</span>}
          {status.state === 'error' && status.message && <span className="muted small">{status.message}</span>}
        </dd>
      </dl>
      <div className="settings__actions">
        <Button icon={RefreshCw} onClick={() => syncNow().then(() => toast('Sincronização concluída'))}>
          Sincronizar agora
        </Button>
        {localSummary && (
          <Button icon={CloudUpload} onClick={doImport} disabled={busy === 'import'}>
            Importar dados do modo sem conta
          </Button>
        )}
      </div>

      <form className="account-form" onSubmit={saveName}>
        <Field label="Nome" htmlFor={`${id}-n`}>
          <Input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Button type="submit" disabled={busy === 'name' || !name.trim() || name.trim() === displayName(user)}>
          Salvar nome
        </Button>
      </form>
      <form className="account-form" onSubmit={savePassword}>
        <Field label="Nova senha" htmlFor={`${id}-p`} hint="Pelo menos 8 caracteres.">
          <Input id={`${id}-p`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Button type="submit" icon={KeyRound} disabled={busy === 'password' || password.length < 8}>
          Alterar senha
        </Button>
      </form>

      <div className="settings__actions account-leave">
        <Button icon={LogOut} onClick={() => leave(false)}>
          Sair
        </Button>
        <Button variant="ghost" onClick={() => leave(true)}>
          Sair e remover dados deste aparelho
        </Button>
      </div>
    </Panel>
  )
}
