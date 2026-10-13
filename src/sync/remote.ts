import type { SupabaseClient } from '@supabase/supabase-js'
import type { TableName } from '../db/database'

/** Linha da tabela `nexo_records` no servidor. */
export interface RemoteRow {
  collection: TableName
  id: string
  data: Record<string, unknown> | null
  deleted: boolean
  updated_at: string
}

export type OutgoingRow = Omit<RemoteRow, 'updated_at'>

/** Operações de que o motor de sincronização precisa (permite testar sem servidor). */
export interface RemoteStore {
  /** Grava (insere ou substitui) as linhas do usuário. */
  upsert(rows: OutgoingRow[]): Promise<void>
  /** Linhas alteradas depois de `since` (ISO), em ordem de atualização. */
  changesSince(since: string | null, limit: number): Promise<RemoteRow[]>
}

export function supabaseRemote(client: SupabaseClient, userId: string): RemoteStore {
  return {
    async upsert(rows) {
      const { error } = await client.from('nexo_records').upsert(
        rows.map((r) => ({ ...r, user_id: userId })),
        { onConflict: 'user_id,collection,id' },
      )
      if (error) throw error
    },
    async changesSince(since, limit) {
      let q = client
        .from('nexo_records')
        .select('collection,id,data,deleted,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit)
      if (since) q = q.gt('updated_at', since)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as RemoteRow[]
    },
  }
}
