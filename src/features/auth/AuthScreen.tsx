import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Eye, EyeOff, HardDrive, History, KeyRound, ListChecks, MailCheck, Repeat2, WifiOff } from 'lucide-react'
import { supabase, appRedirectUrl } from '../../lib/supabase'
import { NexoMark } from '../../components/icons'
import { Button, Field, Input, Segmented } from '../../components/ui'
import { ThemeSwitch } from '../shell/ThemeSwitch'
import { authMessage } from './authErrors'
import { useAuth } from './AuthProvider'

type View = 'entrar' | 'criar' | 'recuperar' | 'confirmar' | 'enviado'

export function AuthScreen() {
  const { enterLocalMode } = useAuth()
  const [view, setView] = useState<View>('entrar')
  const [email, setEmail] = useState('')
  const online = useOnline()

  return (
    <AuthLayout>
      {!online && (
        <p className="auth__notice" role="status">
          <WifiOff size={15} aria-hidden /> Você está offline. Entrar exige conexão; o modo sem conta funciona offline.
        </p>
      )}
      {(view === 'entrar' || view === 'criar') && (
        <Segmented
          label="Acesso"
          value={view}
          onChange={setView}
          options={[
            { id: 'entrar', label: 'Entrar' },
            { id: 'criar', label: 'Criar conta' },
          ]}
        />
      )}
      {view === 'entrar' && <SignInForm email={email} setEmail={setEmail} onForgot={() => setView('recuperar')} />}
      {view === 'criar' && <SignUpForm email={email} setEmail={setEmail} onNeedsConfirm={() => setView('confirmar')} />}
      {view === 'recuperar' && <RecoverForm email={email} setEmail={setEmail} onBack={() => setView('entrar')} onSent={() => setView('enviado')} />}
      {view === 'confirmar' && <ConfirmNotice email={email} onBack={() => setView('entrar')} />}
      {view === 'enviado' && (
        <Notice icon={MailCheck} title="Verifique seu e-mail">
          Se existir uma conta para <strong>{email}</strong>, você receberá um link para criar uma nova senha.
          <Button variant="ghost" icon={ArrowLeft} onClick={() => setView('entrar')}>
            Voltar para entrar
          </Button>
        </Notice>
      )}

      <div className="auth__alt">
        <span className="auth__divider">ou</span>
        <Button variant="ghost" icon={HardDrive} onClick={enterLocalMode}>
          Continuar sem conta
        </Button>
        <p className="auth__alt-hint">Os dados ficam só neste aparelho e não sincronizam. Você pode criar uma conta depois.</p>
      </div>
    </AuthLayout>
  )
}

/** Tela exibida ao abrir o link de “esqueci minha senha”. */
export function NewPasswordScreen() {
  const { finishRecovery } = useAuth()
  const id = useId()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(authMessage(error))
    finishRecovery()
  }

  return (
    <AuthLayout>
      <form className="form auth__form" onSubmit={submit}>
        <h2 className="auth__title">Defina uma nova senha</h2>
        <PasswordField id={`${id}-p`} value={password} onChange={setPassword} autoComplete="new-password" hint="Pelo menos 8 caracteres." />
        {error && (
          <p className="auth__error" role="alert">
            {error}
          </p>
        )}
        <Button variant="primary" type="submit" icon={KeyRound} disabled={busy || password.length < 8}>
          {busy ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  )
}

function SignInForm({ email, setEmail, onForgot }: { email: string; setEmail: (v: string) => void; onForgot: () => void }) {
  const id = useId()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(authMessage(error))
  }

  return (
    <form className="form auth__form" onSubmit={submit} aria-label="Entrar">
      <Field label="E-mail" htmlFor={`${id}-e`}>
        <Input id={`${id}-e`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </Field>
      <PasswordField id={`${id}-p`} value={password} onChange={setPassword} autoComplete="current-password" />
      <button type="button" className="link auth__forgot" onClick={onForgot}>
        Esqueci minha senha
      </button>
      {error && (
        <p className="auth__error" role="alert">
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" disabled={busy || !email || !password}>
        {busy ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

function SignUpForm({ email, setEmail, onNeedsConfirm }: { email: string; setEmail: (v: string) => void; onNeedsConfirm: () => void }) {
  const id = useId()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Use pelo menos 8 caracteres na senha.')
    setBusy(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: appRedirectUrl() },
    })
    setBusy(false)
    if (error) return setError(authMessage(error))
    // sem sessão = o projeto exige confirmação por e-mail
    if (!data.session) onNeedsConfirm()
  }

  return (
    <form className="form auth__form" onSubmit={submit} aria-label="Criar conta">
      <Field label="Nome" htmlFor={`${id}-n`}>
        <Input id={`${id}-n`} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="E-mail" htmlFor={`${id}-e`}>
        <Input id={`${id}-e`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <PasswordField id={`${id}-p`} value={password} onChange={setPassword} autoComplete="new-password" hint="Pelo menos 8 caracteres." />
      {error && (
        <p className="auth__error" role="alert">
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" disabled={busy || !email || !password}>
        {busy ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  )
}

function RecoverForm({ email, setEmail, onBack, onSent }: { email: string; setEmail: (v: string) => void; onBack: () => void; onSent: () => void }) {
  const id = useId()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appRedirectUrl() })
    setBusy(false)
    if (error) return setError(authMessage(error))
    onSent()
  }

  return (
    <form className="form auth__form" onSubmit={submit} aria-label="Recuperar senha">
      <h2 className="auth__title">Recuperar senha</h2>
      <p className="muted">Enviaremos um link para você criar uma nova senha.</p>
      <Field label="E-mail" htmlFor={`${id}-e`}>
        <Input id={`${id}-e`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </Field>
      {error && (
        <p className="auth__error" role="alert">
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" disabled={busy || !email}>
        {busy ? 'Enviando…' : 'Enviar link'}
      </Button>
      <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
        Voltar
      </Button>
    </form>
  )
}

function ConfirmNotice({ email, onBack }: { email: string; onBack: () => void }) {
  const [msg, setMsg] = useState('')
  const resend = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: appRedirectUrl() } })
    setMsg(error ? authMessage(error) : 'Enviamos o link novamente.')
  }
  return (
    <Notice icon={MailCheck} title="Confirme seu e-mail">
      Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, volte aqui e entre com sua senha.
      <div className="auth__row">
        <Button variant="primary" icon={ArrowLeft} onClick={onBack}>
          Ir para entrar
        </Button>
        <Button variant="ghost" onClick={resend}>
          Reenviar link
        </Button>
      </div>
      {msg && <p role="status">{msg}</p>}
    </Notice>
  )
}

function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <Field label="Senha" htmlFor={id} hint={hint}>
      <span className="password">
        <Input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} required value={value} onChange={(e) => onChange(e.target.value)} />
        <button
          type="button"
          className="password__toggle"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </span>
    </Field>
  )
}

function Notice({ icon: Icon, title, children }: { icon: typeof MailCheck; title: string; children: ReactNode }) {
  return (
    <div className="auth__notice-card" role="status">
      <Icon size={22} aria-hidden />
      <h2 className="auth__title">{title}</h2>
      <div className="auth__notice-body">{children}</div>
    </div>
  )
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__logo">
          <NexoMark size={34} />
          <span className="brand__name">nexo</span>
        </div>
        <div className="auth__pitch">
          <h1>Sua operação pessoal, rastreável.</h1>
          <ul>
            <li>
              <ListChecks size={17} aria-hidden /> Tarefas, projetos e prioridades
            </li>
            <li>
              <Repeat2 size={17} aria-hidden /> Rotinas com histórico de consistência
            </li>
            <li>
              <History size={17} aria-hidden /> Tudo o que muda fica registrado
            </li>
          </ul>
        </div>
        <p className="auth__foot">Seus dados sincronizam entre aparelhos e só você tem acesso a eles.</p>
      </aside>
      <main className="auth__main">
        <div className="auth__theme">
          <ThemeSwitch />
        </div>
        <div className="auth__card">{children}</div>
      </main>
    </div>
  )
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
