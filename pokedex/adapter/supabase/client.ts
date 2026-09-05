import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

export function getSupabaseClient(url: string, anonKey: string) {
  if (!client) client = createClient(url, anonKey)
  return client
}
