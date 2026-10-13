import Dexie from 'dexie'
import { LOCAL_DB_NAME, NexoDB, TABLES, db } from '../../db/database'
import { isEmpty } from '../../db/backup'

export interface LocalSummary {
  total: number
  tasks: number
  routines: number
  methods: number
  posts: number
}

/** Quanto existe no banco do modo sem conta deste navegador (null se não houver nada). */
export async function localDataSummary(): Promise<LocalSummary | null> {
  if (db.name === LOCAL_DB_NAME || !(await Dexie.exists(LOCAL_DB_NAME))) return null
  const local = new NexoDB(LOCAL_DB_NAME)
  try {
    const [tasks, routines, methods, posts, templates, projects] = await Promise.all(
      (['tasks', 'routines', 'methods', 'posts', 'templates', 'projects'] as const).map((t) => local.table(t).count()),
    )
    const total = tasks + routines + methods + posts + templates + projects
    return total ? { total, tasks, routines, methods, posts } : null
  } finally {
    local.close()
  }
}

export const accountIsEmpty = isEmpty

/**
 * Copia os dados do modo sem conta para a conta atual (que os envia à nuvem).
 * Os registros mantêm seus identificadores; contadores ficam com o maior valor.
 */
export async function importLocalData(): Promise<number> {
  const local = new NexoDB(LOCAL_DB_NAME)
  try {
    const data = new Map<string, unknown[]>()
    for (const t of TABLES) data.set(t, await local.table(t).toArray())
    let count = 0
    await db.transaction('rw', [...TABLES], async () => {
      for (const t of TABLES) {
        const rows = data.get(t) as Record<string, unknown>[]
        if (!rows.length) continue
        if (t === 'counters') {
          for (const c of rows as { name: string; value: number }[]) {
            const cur = await db.counters.get(c.name as never)
            await db.counters.put({ name: c.name as never, value: Math.max(cur?.value ?? 0, c.value) })
          }
          continue
        }
        await db.table(t).bulkPut(rows)
        count += rows.length
      }
    })
    return count
  } finally {
    local.close()
  }
}
