import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthAdapter } from '../adapter/supabase/auth'
import { useAuth } from '../composables/useAuth'

function createAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    getSession: vi.fn().mockResolvedValue(null),
    signIn: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
    signUp: vi.fn().mockResolvedValue(null),
    signOut: vi.fn().mockResolvedValue(undefined),
    onAuthStateChange: vi.fn().mockReturnValue(() => {}),
    ...overrides
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAuth', () => {
  it('initializes an injected adapter and exposes its configuration state', async () => {
    const adapter = createAdapter()
    let state!: ReturnType<typeof useAuth>

    mount({
      setup() {
        state = useAuth(adapter)
        return {}
      },
      template: '<div />'
    })
    await nextTick()

    expect(state.isConfigured.value).toBe(true)
    expect(state.initialized.value).toBe(true)
    expect(adapter.getSession).toHaveBeenCalledOnce()
    expect(adapter.onAuthStateChange).toHaveBeenCalledOnce()
  })

  it('surfaces sign-in failures and handles sign-up without an immediate session', async () => {
    const adapter = createAdapter()
    let state!: ReturnType<typeof useAuth>

    mount({
      setup() {
        state = useAuth(adapter)
        return {}
      },
      template: '<div />'
    })
    await nextTick()

    await state.signIn('user@example.com', 'wrong-password')
    expect(state.error.value).toBe('Invalid credentials')

    await state.signUp('user@example.com', 'password')
    expect(state.message.value).toBe('Check your email to confirm your account.')
    expect(adapter.signUp).toHaveBeenCalledWith('user@example.com', 'password')
  })

  it('supports an unconfigured application without requiring Supabase', async () => {
    let state!: ReturnType<typeof useAuth>

    mount({
      setup() {
        state = useAuth()
        return {}
      },
      template: '<div />'
    })
    await nextTick()

    expect(state.isConfigured.value).toBe(false)
    expect(state.initialized.value).toBe(true)
    await state.signOut()
  })
})
