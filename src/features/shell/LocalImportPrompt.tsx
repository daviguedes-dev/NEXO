import { useEffect, useRef } from 'react'
import { useConfirm, useToast } from '../../components/feedback'
import { useSyncStatus } from '../../sync/engine'
import { useAuth } from '../auth/AuthProvider'
import { accountIsEmpty, importLocalData, localDataSummary } from '../auth/importLocal'

const flagKey = (uid: string) => `nexo:import-asked:${uid}`

/**
 * Na primeira vez que uma conta vazia é aberta num navegador que já tinha dados
 * do modo sem conta, oferece importá-los para a conta.
 */
export function LocalImportPrompt() {
  const { state } = useAuth()
  const status = useSyncStatus()
  const confirm = useConfirm()
  const toast = useToast()
  const asked = useRef(false)
  const uid = state.status === 'ready' && state.mode === 'cloud' ? state.user.id : null
  const ready = !!uid && status.lastSyncedAt !== null

  useEffect(() => {
    if (!ready || !uid || asked.current) return
    asked.current = true
    void (async () => {
      try {
        if (localStorage.getItem(flagKey(uid))) return
      } catch {
        return
      }
      const summary = await localDataSummary()
      if (!summary || !(await accountIsEmpty())) return
      localStorage.setItem(flagKey(uid), '1')
      const ok = await confirm({
        title: 'Trazer seus dados para a conta?',
        message: `Este navegador tem dados do modo sem conta (${summary.tasks} tarefas, ${summary.routines} rotinas, ${summary.methods} métodos e ${summary.posts} publicações). Importá-los para a sua conta os deixa disponíveis em todos os seus aparelhos.`,
        confirmLabel: 'Importar para a conta',
      })
      if (!ok) return
      const n = await importLocalData()
      toast(`${n} registros importados — enviando para a nuvem`)
    })()
  }, [ready, uid, confirm, toast])

  return null
}
