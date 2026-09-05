import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js'

export type AuthAdapter = {
  getSession: () => Promise<Session | null>
  signIn: (email: string, password: string) => Promise<Session>
  signUp: (email: string, password: string) => Promise<Session | null>
  signOut: () => Promise<void>
  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => () => void
}

export function createSupabaseAuthAdapter(client: SupabaseClient): AuthAdapter {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      return data.session
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.session) throw new Error('Sign-in did not create a session.')
      return data.session
    },
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) throw error
      return data.session
    },
    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw error
    },
    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange(callback)
      return () => data.subscription.unsubscribe()
    }
  }
}
