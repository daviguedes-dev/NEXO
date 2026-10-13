import { TABLES, db, type TableName } from './database'

export const BACKUP_APP = 'nexo'
export const BACKUP_SCHEMA = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  schema: number
  exportedAt: string
  data: Record<TableName, unknown[]>
}

export async function exportAll(): Promise<BackupFile> {
  const data = {} as Record<TableName, unknown[]>
  await db.transaction(
    'r',
    TABLES.map((t) => db.table(t)),
    async () => {
      for (const t of TABLES) data[t] = await db.table(t).toArray()
    },
  )
  return { app: BACKUP_APP, schema: BACKUP_SCHEMA, exportedAt: new Date().toISOString(), data }
}

export function parseBackup(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo de backup vazio ou inválido.')
  const file = raw as Partial<BackupFile>
  if (file.app !== BACKUP_APP) throw new Error('Este arquivo não foi exportado pelo Nexo.')
  if (typeof file.schema !== 'number' || file.schema > BACKUP_SCHEMA) throw new Error('Versão de backup não suportada por esta versão do Nexo.')
  if (!file.data || typeof file.data !== 'object') throw new Error('O backup não contém dados.')
  for (const t of TABLES) {
    const rows = (file.data as Record<string, unknown>)[t]
    if (rows !== undefined && !Array.isArray(rows)) throw new Error(`A tabela “${t}” está corrompida.`)
  }
  return file as BackupFile
}

/** Substitui todos os dados locais pelo conteúdo do backup (operação atômica). */
export async function restoreAll(file: BackupFile): Promise<void> {
  await db.transaction(
    'rw',
    TABLES.map((t) => db.table(t)),
    async () => {
      for (const t of TABLES) {
        await db.table(t).clear()
        const rows = file.data[t]
        if (rows?.length) await db.table(t).bulkAdd(rows)
      }
    },
  )
}

export async function clearAll(): Promise<void> {
  await db.transaction(
    'rw',
    TABLES.map((t) => db.table(t)),
    async () => {
      for (const t of TABLES) await db.table(t).clear()
    },
  )
}

export async function isEmpty(): Promise<boolean> {
  const counts = await Promise.all((['tasks', 'routines', 'methods', 'posts', 'templates', 'projects'] as const).map((t) => db.table(t).count()))
  return counts.every((c) => c === 0)
}
