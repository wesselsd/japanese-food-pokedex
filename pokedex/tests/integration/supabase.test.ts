import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

const url = import.meta.env.NUXT_PUBLIC_SUPABASE_URL
const anonKey = import.meta.env.NUXT_PUBLIC_SUPABASE_ANON_KEY

describe('Supabase database', () => {
  it('can read the foods table', async () => {
    if (!url || !anonKey) {
      throw new Error('Supabase environment variables are missing.')
    }

    const supabase = createClient(url, anonKey)
    const { data, error } = await supabase.from('foods').select('id').limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
})
