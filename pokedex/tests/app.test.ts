import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../app.vue'

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

function mountApp() {
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      googleMapsApiKey: '',
      googleMapsMapId: ''
    }
  }))

  return mount(App)
}

describe('application flow', () => {
  it('shows locked variations before their parent is eaten', async () => {
    const wrapper = mountApp()
    await nextTick()

    expect(wrapper.find('.locked-notice').text()).toContain('29 variations')
    expect(wrapper.text()).not.toContain('Uni gunkan')
  })

  it('checks in a root food and reveals its variations', async () => {
    const wrapper = mountApp()
    const search = wrapper.find('input[type="search"]')
    await search.setValue('sushi')
    await nextTick()

    expect(wrapper.findAll('.food-card')).toHaveLength(1)
    await wrapper.find('.try-button').trigger('click')
    await wrapper.find('.checkin-dialog').trigger('submit')
    await nextTick()
    await nextTick()
    await search.setValue('')
    await nextTick()

    expect(wrapper.find('.checkin-dialog').exists()).toBe(false)
    expect(wrapper.find('.locked-notice').text()).toContain('23 variations')
    expect(wrapper.text()).toContain('Uni gunkan')
  })
})
