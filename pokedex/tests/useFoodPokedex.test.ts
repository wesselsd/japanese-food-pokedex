import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { foods } from '~/data/foods'
import { useFoodPokedex } from '~/composables/useFoodPokedex'

function mountComposable() {
  let state!: ReturnType<typeof useFoodPokedex>

  mount({
    setup() {
      state = useFoodPokedex(foods)
      return {}
    },
    template: '<div />'
  })

  return state
}

afterEach(() => {
  localStorage.clear()
})

describe('useFoodPokedex', () => {
  it('filters foods by search term and category', async () => {
    const state = mountComposable()

    expect(state.filteredFoods.value).toHaveLength(6)

    state.searchTerm.value = '寿司'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['sushi'])

    state.searchTerm.value = ''
    state.selectedCategory.value = 'Street food'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['okonomiyaki', 'takoyaki'])
  })

  it('toggles eaten foods and persists the state', async () => {
    const state = mountComposable()

    state.toggleEaten('ramen')
    await nextTick()
    expect(state.eatenFoods.value).toEqual(['ramen'])
    expect(state.eatenCount.value).toBe(1)
    expect(localStorage.getItem('pokedex-eaten')).toBe('["ramen"]')

    state.toggleEaten('ramen')
    await nextTick()
    expect(state.eatenFoods.value).toEqual([])
  })

  it('restores saved eaten foods on mount', () => {
    localStorage.setItem('pokedex-eaten', '["sushi", "onigiri"]')

    const state = mountComposable()

    expect(state.eatenFoods.value).toEqual(['sushi', 'onigiri'])
    expect(state.eatenCount.value).toBe(2)
  })
})
