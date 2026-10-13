import { createClient } from '@supabase/supabase-js'

/**
 * Projeto Supabase do Nexo. A chave publicável é pública por definição (vai no
 * navegador); o acesso aos dados é protegido por RLS no banco.
 * Para usar outro projeto, defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || 'https://harpmzexpfpqfppzcstw.supabase.co'
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_sQZqoBl-jbiUXjKzNFO2Ow_L-GBLYTn'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'nexo-auth',
  },
})

/** Endereço para onde os e-mails de confirmação e de nova senha devem voltar. */
export function appRedirectUrl(): string | undefined {
  if (!/^https?:$/.test(location.protocol)) return undefined
  return `${location.origin}${location.pathname}`
}
