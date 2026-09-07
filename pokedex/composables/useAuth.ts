import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { AuthAdapter } from '~/adapter/supabase/auth'

export function useAuth(initialAdapter: AuthAdapter | null = null) {
  const authAdapter = ref<AuthAdapter | null>(initialAdapter)
  const session = ref<Session | null>(null)
  const initialized = ref(false)
  const error = ref('')
  const message = ref('')
  let unsubscribe: (() => void) | undefined

  const user = computed(() => session.value?.user ?? null)
  const isConfigured = computed(() => Boolean(authAdapter.value))

  async function initialize() {
    const adapter = authAdapter.value
    if (!adapter) {
      initialized.value = true
      return
    }

    session.value = await adapter.getSession()
    unsubscribe = adapter.onAuthStateChange((_event: AuthChangeEvent, nextSession) => {
      session.value = nextSession
    })
    initialized.value = true
  }

  async function signIn(email: string, password: string) {
    if (!authAdapter.value) throw new Error('Supabase authentication is not configured.')
    error.value = ''
    message.value = ''
    try {
      session.value = await authAdapter.value.signIn(email, password)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to sign in.'
    }
  }

  async function signUp(email: string, password: string) {
    if (!authAdapter.value) throw new Error('Supabase authentication is not configured.')
    error.value = ''
    message.value = ''
    try {
      const nextSession = await authAdapter.value.signUp(email, password)
      session.value = nextSession
      message.value = nextSession ? 'Account created.' : 'Check your email to confirm your account.'
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to create account.'
    }
  }

  async function signOut() {
    if (!authAdapter.value) return
    await authAdapter.value.signOut()
    session.value = null
  }

  onMounted(initialize)
  onUnmounted(() => unsubscribe?.())

  return { user, session, initialized, isConfigured, error, message, signIn, signUp, signOut }
}
