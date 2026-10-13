import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Dialog } from './Dialog'
import { Button } from './ui'

/* ---------------------------------------------------------------- toasts */

interface Toast {
  id: number
  message: string
  tone: 'ok' | 'error'
  action?: { label: string; run: () => void }
}

const ToastCtx = createContext<(message: string, opts?: { tone?: Toast['tone']; action?: Toast['action'] }) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

/* ------------------------------------------------------------ confirmação */

interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
}

const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

  const toast = useCallback((message: string, opts?: { tone?: Toast['tone']; action?: Toast['action'] }) => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-2), { id, message, tone: opts?.tone ?? 'ok', action: opts?.action }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts?.action ? 6000 : 3200)
  }, [])

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...o, resolve })), [])

  const close = (v: boolean) => {
    confirmState?.resolve(v)
    setConfirmState(null)
  }

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  return (
    <ToastCtx.Provider value={value.toast}>
      <ConfirmCtx.Provider value={value.confirm}>
        {children}
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.tone}`}>
              {t.tone === 'ok' ? <CheckCircle2 size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
              <span>{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    t.action?.run()
                    setToasts((all) => all.filter((x) => x.id !== t.id))
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
        <Dialog
          open={!!confirmState}
          onClose={() => close(false)}
          title={confirmState?.title ?? ''}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                {confirmState?.confirmLabel ?? 'Confirmar'}
              </Button>
            </>
          }
        >
          <div className="confirm-text">{confirmState?.message}</div>
        </Dialog>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}
