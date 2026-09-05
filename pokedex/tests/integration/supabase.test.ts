import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseAuthAdapter } from '../../adapter/supabase/auth'

const url = import.meta.env.NUXT_PUBLIC_SUPABASE_URL
const anonKey = import.meta.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = url && anonKey ? createClient(url, anonKey) : null

describe('Supabase database', () => {
  it('can read the foods table', async () => {
    if (!url || !anonKey) {
      throw new Error('Supabase environment variables are missing.')
    }

    const { data, error } = await supabase!.from('foods').select('id').limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
})

describe('Supabase authentication', () => {
  it('can reach the auth service without an active session', async () => {
    if (!url || !anonKey) {
      throw new Error('Supabase environment variables are missing.')
    }

    const auth = createSupabaseAuthAdapter(supabase!)

    await expect(auth.getSession()).resolves.toBeNull()
  })
})
