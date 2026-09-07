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

  it('edits and removes a check-in from the food details dialog', async () => {
    const wrapper = mountApp()
    const search = wrapper.find('input[type="search"]')
    await search.setValue('sushi')
    await wrapper.find('.try-button').trigger('click')
    await wrapper.find('.checkin-dialog').trigger('submit')
    await nextTick()
    await wrapper.find('.food-card').trigger('click')

    await wrapper.find('.edit-checkin').trigger('click')
    await wrapper.find('input[type="radio"][value="5"]').setValue()
    await wrapper.find('input[placeholder="Town, region, or restaurant"]').setValue('Tokyo')
    await wrapper.find('.checkin-dialog').trigger('submit')
    await nextTick()

    expect(wrapper.text()).toContain('5/5 stars')
    expect(wrapper.text()).toContain('Tokyo')

    await wrapper.find('.edit-checkin').trigger('click')
    await wrapper.find('.remove-checkin').trigger('click')
    await nextTick()

    expect(wrapper.find('.detail-meta').text()).toContain('Not yet eaten')
  })

  it('selects and removes uploaded photos from the detail dialog', async () => {
    localStorage.setItem('pokedex-photos', JSON.stringify({
      sushi: [{ id: 'photo-1', url: 'data:image/jpeg;base64,photo' }]
    }))
    localStorage.setItem('pokedex-selected-photos', JSON.stringify({ sushi: 'photo-1' }))
    const wrapper = mountApp()
    const search = wrapper.find('input[type="search"]')
    await search.setValue('sushi')
    await nextTick()
    await nextTick()
    await wrapper.find('.food-card').trigger('click')

    expect(wrapper.findAll('.photo-choice')).toHaveLength(2)
    await wrapper.findAll('.photo-choice')[0].trigger('click')
    await nextTick()
    expect(wrapper.findAll('.photo-choice')[0].classes()).toContain('selected')

    await wrapper.find('.remove-photo').trigger('click')
    await nextTick()

    expect(wrapper.find('.remove-photo').exists()).toBe(false)
    expect(wrapper.findAll('.photo-choice')).toHaveLength(1)
  })
})
