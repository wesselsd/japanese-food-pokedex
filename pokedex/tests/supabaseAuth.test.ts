import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createSupabaseAuthAdapter } from '../adapter/supabase/auth'

function createClient() {
  const unsubscribe = vi.fn()
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: {} as Session }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } })
  }

  return {
    client: { auth } as unknown as SupabaseClient,
    auth,
    unsubscribe
  }
}

describe('Supabase authentication adapter', () => {
  it('maps session and authentication operations', async () => {
    const { client, auth, unsubscribe } = createClient()
    const adapter = createSupabaseAuthAdapter(client)

    await expect(adapter.getSession()).resolves.toBeNull()
    await expect(adapter.signIn('user@example.com', 'password')).resolves.toEqual({})
    await expect(adapter.signUp('user@example.com', 'password')).resolves.toBeNull()
    await expect(adapter.signOut()).resolves.toBeUndefined()
    const callback = vi.fn()
    const stopListening = adapter.onAuthStateChange(callback)

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password'
    })
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password'
    })
    expect(auth.signOut).toHaveBeenCalledOnce()
    expect(auth.onAuthStateChange).toHaveBeenCalledWith(callback)

    stopListening()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('propagates Supabase errors', async () => {
    const { client, auth } = createClient()
    const error = new Error('Authentication unavailable')
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error })
    auth.signOut.mockResolvedValueOnce({ error })
    const adapter = createSupabaseAuthAdapter(client)

    await expect(adapter.getSession()).rejects.toThrow('Authentication unavailable')
    await expect(adapter.signOut()).rejects.toThrow('Authentication unavailable')
  })

  it('rejects sign-in when Supabase returns no session', async () => {
    const { client, auth } = createClient()
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: null })
    const adapter = createSupabaseAuthAdapter(client)

    await expect(adapter.signIn('user@example.com', 'password'))
      .rejects.toThrow('Sign-in did not create a session.')
  })
})
