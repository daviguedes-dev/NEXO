import { useEffect, useRef, useState } from 'react'
import { Database, Download, HardDrive, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import { clearAll, exportAll, parseBackup, restoreAll } from '../../db/backup'
import { loadExampleData } from '../../db/seed'
import { useLabels } from '../../db/hooks'
import { deleteLabel, updateLabel } from '../../db/tasks'
import { todayISO } from '../../lib/dates'
import { SWATCHES } from '../../lib/meta'
import { Menu } from '../../components/Menu'
import { useConfirm, useToast } from '../../components/feedback'
import { Button, Input, PageHeader, Panel } from '../../components/ui'

export function SettingsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const fileRef = useRef<HTMLInputElement>(null)
  const labels = useLabels()
  const counts = useLiveQuery(async () => ({
    tasks: await db.tasks.count(),
    routines: await db.routines.count(),
    logs: await db.routineLogs.count(),
    methods: await db.methods.count(),
    runs: await db.methodRuns.count(),
    posts: await db.posts.count(),
    templates: await db.templates.count(),
    activity: await db.activity.count(),
  }))
  const [storage, setStorage] = useState<{ usage?: number; quota?: number; persisted?: boolean }>({})

  useEffect(() => {
    void (async () => {
      const est = await navigator.storage?.estimate?.()
      const persisted = await navigator.storage?.persisted?.()
      setStorage({ usage: est?.usage, quota: est?.quota, persisted })
    })()
  }, [])

  const exportFile = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexo-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup exportado')
  }

  const importFile = async (file: File) => {
    try {
      const parsed = parseBackup(await file.text())
      const total = Object.values(parsed.data).reduce((n, rows) => n + (rows?.length ?? 0), 0)
      const ok = await confirm({
        title: 'Restaurar backup?',
        message: `O arquivo tem ${total} registros (exportado em ${new Date(parsed.exportedAt).toLocaleString('pt-BR')}). Os dados atuais deste navegador serão substituídos.`,
        confirmLabel: 'Substituir e restaurar',
        danger: true,
      })
      if (!ok) return
      await restoreAll(parsed)
      toast('Backup restaurado')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.', { tone: 'error' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const mb = (n?: number) => (n === undefined ? '—' : `${(n / 1024 / 1024).toFixed(n < 1024 * 1024 ? 2 : 1)} MB`)

  return (
    <div className="page">
      <PageHeader
        section="configurações"
        title="Configurações"
        description="Seus dados ficam no armazenamento local deste navegador. Faça backups regulares."
      />

      <div className="settings">
        <Panel title="Backup e restauração">
          <p className="muted">Exporte tudo — tarefas, rotinas e execuções, métodos, publicações e o histórico completo — em um arquivo JSON.</p>
          <div className="settings__actions">
            <Button variant="primary" icon={Download} onClick={exportFile}>
              Exportar backup
            </Button>
            <Button icon={Upload} onClick={() => fileRef.current?.click()}>
              Importar backup
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </div>
          {counts && (
            <dl className="kv kv--grid">
              <dt>Tarefas</dt>
              <dd className="mono">{counts.tasks}</dd>
              <dt>Rotinas / execuções</dt>
              <dd className="mono">
                {counts.routines} / {counts.logs}
              </dd>
              <dt>Métodos / execuções</dt>
              <dd className="mono">
                {counts.methods} / {counts.runs}
              </dd>
              <dt>Publicações / modelos</dt>
              <dd className="mono">
                {counts.posts} / {counts.templates}
              </dd>
              <dt>Registros de histórico</dt>
              <dd className="mono">{counts.activity}</dd>
            </dl>
          )}
        </Panel>

        <Panel title="Armazenamento">
          <dl className="kv">
            <dt>
              <HardDrive size={14} aria-hidden /> Em uso
            </dt>
            <dd className="mono">
              {mb(storage.usage)} <span className="muted">de {mb(storage.quota)} disponíveis</span>
            </dd>
            <dt>
              <ShieldCheck size={14} aria-hidden /> Proteção
            </dt>
            <dd>
              {storage.persisted
                ? 'Persistente — o navegador não apaga os dados para liberar espaço.'
                : 'Padrão — o navegador pode liberar espaço em situações extremas.'}
            </dd>
          </dl>
          {!storage.persisted && navigator.storage?.persist && (
            <Button
              size="sm"
              icon={ShieldCheck}
              onClick={async () => {
                const ok = await navigator.storage.persist()
                setStorage((s) => ({ ...s, persisted: ok }))
                toast(ok ? 'Armazenamento persistente ativado' : 'O navegador não concedeu a proteção agora', { tone: ok ? 'ok' : 'error' })
              }}
            >
              Solicitar armazenamento persistente
            </Button>
          )}
        </Panel>

        <Panel title="Etiquetas" count={labels.length}>
          {labels.length === 0 ? (
            <p className="muted">Crie etiquetas ao editar uma tarefa.</p>
          ) : (
            <ul className="label-admin">
              {labels.map((l) => (
                <li key={l.id}>
                  <Menu
                    label={`Cor da etiqueta ${l.name}`}
                    triggerClassName="swatch-trigger"
                    trigger={<span className="swatch-trigger__dot" style={{ background: l.color }} />}
                    items={SWATCHES.map((c) => ({
                      id: c,
                      label: <span className="dot" style={{ background: c }} />,
                      selected: c === l.color,
                      onSelect: () => updateLabel(l.id, { color: c }),
                    }))}
                  />
                  <Input
                    defaultValue={l.name}
                    aria-label="Nome da etiqueta"
                    onBlur={(e) => e.target.value.trim() && e.target.value !== l.name && updateLabel(l.id, { name: e.target.value.trim() })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={Trash2}
                    aria-label={`Excluir etiqueta ${l.name}`}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: `Excluir “${l.name}”?`,
                          message: 'A etiqueta será removida de todas as tarefas.',
                          confirmLabel: 'Excluir',
                          danger: true,
                        })
                      )
                        await deleteLabel(l.id)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Dados de exemplo e limpeza" className="danger-zone">
          <div className="danger-row">
            <div>
              <p className="danger-row__title">Carregar dados de exemplo</p>
              <p className="muted small">Substitui todos os dados por um conjunto genérico para demonstração.</p>
            </div>
            <Button
              icon={Database}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: 'Carregar exemplos?',
                    message: 'Todos os dados atuais serão substituídos. Exporte um backup antes, se necessário.',
                    confirmLabel: 'Substituir por exemplos',
                    danger: true,
                  }))
                )
                  return
                await loadExampleData()
                toast('Dados de exemplo carregados')
              }}
            >
              Carregar exemplos
            </Button>
          </div>
          <div className="danger-row">
            <div>
              <p className="danger-row__title">Apagar todos os dados</p>
              <p className="muted small">Remove definitivamente tudo o que está salvo neste navegador.</p>
            </div>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: 'Apagar tudo?',
                    message: 'Esta ação não pode ser desfeita. Recomendamos exportar um backup antes.',
                    confirmLabel: 'Apagar todos os dados',
                    danger: true,
                  }))
                )
                  return
                await clearAll()
                toast('Todos os dados foram apagados')
              }}
            >
              Apagar tudo
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
