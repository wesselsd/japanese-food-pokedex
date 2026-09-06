import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { foodLabels, foods } from '../data/foods'
import { useFoodPokedex } from '../composables/useFoodPokedex'

function mountComposable() {
  let state!: ReturnType<typeof useFoodPokedex>

  mount({
    setup() {
      state = useFoodPokedex(foods, ref(null))
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
  it('deduplicates category and food type labels', () => {
    const yakiniku = foods.find((food) => food.id === 'yakiniku')

    expect(yakiniku).toBeDefined()
    expect(foodLabels(yakiniku!)).toEqual(['Meat', 'grilled'])
  })

  it('filters foods by a selected label', async () => {
    const state = mountComposable()

    state.selectedLabel.value = 'sake'
    await nextTick()

    expect(state.filteredFoods.value.map((food) => food.id)).toEqual([
      'junmai-sake',
      'ginjo-sake',
      'nigori-sake',
      'namazake'
    ])
  })

  it('filters foods by search term and category', async () => {
    const state = mountComposable()

    expect(state.filteredFoods.value).toHaveLength(112)
    expect(foods.filter((food) => food.essential)).toHaveLength(14)
    expect(state.categories).toEqual(['All', 'Noodles', 'Rice & Bowls', 'Meat', 'Seafood', 'Dumplings & Buns', 'Sweets', 'Savory', 'Drinks'])
    expect(foods.filter((food) => food.image)).toHaveLength(112)

    state.searchTerm.value = '寿司'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['sushi'])

    state.searchTerm.value = ''
    state.selectedCategory.value = 'Meat'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual([
      'tonkatsu',
      'karaage',
      'yakitori',
      'chicken-nanban',
      'sukiyaki',
      'shabu-shabu',
      'gyutan',
      'motsunabe',
      'nikujaga',
      'yakiniku',
      'menchi-katsu',
      'tebasaki',
      'tsukune',
      'famichiki'
    ])

    state.selectedCategory.value = 'All'
    state.selectedLabel.value = 'grilled'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['yakitori', 'gyutan', 'yakiniku', 'unagi', 'tsukune', 'grilled-squid'])
  })

  it('toggles eaten foods and persists the state', async () => {
    const state = mountComposable()

    await state.toggleEaten('ramen')
    await nextTick()
    expect(state.eatenFoods.value).toEqual(['ramen'])
    expect(state.eatenCount.value).toBe(1)
    expect(state.eatenDates.value.ramen).toBeDefined()
    expect(localStorage.getItem('pokedex-eaten')).toBe('["ramen"]')

    await state.toggleEaten('ramen')
    await nextTick()
    expect(state.eatenFoods.value).toEqual([])
    expect(state.eatenDates.value).toEqual({})
  })

  it('filters foods by eaten status', async () => {
    const state = mountComposable()

    await state.toggleEaten('ramen')
    state.eatenFilter.value = 'eaten'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['ramen'])

    state.eatenFilter.value = 'uneaten'
    await nextTick()
    expect(state.filteredFoods.value).toHaveLength(111)
    expect(state.filteredFoods.value.some((food) => food.id === 'ramen')).toBe(false)
  })

  it('restores saved eaten foods on mount', () => {
    localStorage.setItem('pokedex-eaten', '["sushi", "onigiri"]')

    const state = mountComposable()

    expect(state.eatenFoods.value).toEqual(['sushi', 'onigiri'])
    expect(state.eatenCount.value).toBe(2)
  })
})
