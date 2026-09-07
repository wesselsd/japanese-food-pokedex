import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { foodLabels, foods } from '../data/foods'
import { useFoodPokedex } from '../composables/useFoodPokedex'
import { createLocalProgressStore } from '../adapter/localProgress'

function mountComposable(foodList = foods) {
  return mountComposableWithStore(foodList, createLocalProgressStore())
}

function mountComposableWithStore(foodList: typeof foods, store: ReturnType<typeof createLocalProgressStore>) {
  let state!: ReturnType<typeof useFoodPokedex>

  mount({
    setup() {
      state = useFoodPokedex(foodList, ref(store))
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
    expect(foodLabels(yakiniku!)).toEqual(['Meat', 'Grilled'])
  })

  it('does not repeat Rice as a label for Rice & Bowls foods', () => {
    const onigiri = foods.find((food) => food.id === 'onigiri')
    expect(onigiri).toBeDefined()
    expect(foodLabels(onigiri!)).not.toContain('Rice')
  })

  it('filters foods by a selected label', async () => {
    const state = mountComposable()

    state.selectedLabel.value = 'sake'
    await nextTick()

    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['sake'])

    await state.checkIn('sake', 4)
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual([
      'sake',
      'junmai-sake',
      'ginjo-sake',
      'nigori-sake',
      'namazake'
    ])

    state.selectedLabel.value = 'tea'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['tea'])

    await state.checkIn('tea', 4)
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['tea', 'green-tea', 'hojicha', 'mugicha'])
  })

  it('filters foods by search term and category', async () => {
    const state = mountComposable()

    expect(state.filteredFoods.value).toHaveLength(87)
    expect(foods.filter((food) => food.essential)).toHaveLength(14)
    expect(state.categories).toEqual(['All', 'Noodles', 'Rice & Bowls', 'Meat', 'Seafood', 'Dumplings & Buns', 'Sweets', 'Savory', 'Drinks'])

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
      'grilled-gyutan',
      'motsunabe',
      'nikujaga',
      'yakiniku',
      'menchi-katsu',
      'tebasaki',
      'famichiki'
    ])

    state.selectedCategory.value = 'All'
    state.selectedLabel.value = 'grilled'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['yakitori', 'grilled-gyutan', 'yakiniku', 'unagi-kabayaki', 'grilled-squid'])
  })

  it('toggles eaten foods and persists the state', async () => {
    const state = mountComposable()

    expect(state.eatenEssentialCount.value).toBe(0)
    expect(state.essentialCount).toBe(14)
    await state.toggleEaten('ramen')
    await nextTick()
    expect(state.eatenFoods.value).toEqual(['ramen'])
    expect(state.eatenCount.value).toBe(1)
    expect(state.eatenEssentialCount.value).toBe(1)
    expect(state.checkins.value[0]).toMatchObject({ foodId: 'ramen', rating: 5 })

    await state.toggleEaten('ramen')
    await nextTick()
    expect(state.eatenFoods.value).toEqual([])
    expect(state.checkins.value).toEqual([])
  })

  it('keeps multiple check-ins for the same food', async () => {
    const state = mountComposable()

    await state.checkIn('ramen', 5, 'Tokyo')
    await state.checkIn('ramen', 2, 'Zurich')

    expect(state.checkins.value).toHaveLength(2)
    expect(state.checkins.value.map((checkin) => checkin.location)).toEqual(['Tokyo', 'Zurich'])
    expect(state.eatenFoods.value).toEqual(['ramen'])
  })

  it('persists a selected map location with a check-in', async () => {
    const state = mountComposable()
    const location = {
      placeId: 'place-1',
      name: 'Sushi Bar',
      address: 'Tokyo, Japan',
      latitude: 35.6762,
      longitude: 139.6503,
      mapsUrl: 'https://www.google.com/maps/place/place-1'
    }

    await state.checkIn('sushi', 3, location.name, location)

    expect(state.checkins.value[0]).toMatchObject({ location: 'Sushi Bar', locationDetails: location })
    expect(JSON.parse(localStorage.getItem('pokedex-checkins')!)[0].locationDetails).toEqual(location)
  })

  it('filters foods by eaten status', async () => {
    const state = mountComposable()

    await state.toggleEaten('ramen')
    state.eatenFilter.value = 'eaten'
    await nextTick()
    expect(state.filteredFoods.value.map((food) => food.id)).toEqual(['ramen'])

    state.eatenFilter.value = 'uneaten'
    await nextTick()
    expect(state.filteredFoods.value).toHaveLength(88)
    expect(state.filteredFoods.value.some((food) => food.id === 'ramen')).toBe(false)
  })

  it('hides variations until their parent has been checked in', () => {
    const state = mountComposable()

    expect(state.visibleFoods.value.some((food) => food.id === 'sushi')).toBe(true)
    expect(state.visibleFoods.value.some((food) => food.id === 'uni-gunkan')).toBe(false)
    expect(state.lockedVariationCount.value).toBe(29)
  })

  it('does not expose locked variations through search or filters', async () => {
    const state = mountComposable()

    state.searchTerm.value = 'tsukemen'
    await nextTick()
    expect(state.filteredFoods.value).toEqual([])

    state.searchTerm.value = ''
    state.selectedCategory.value = 'Noodles'
    await nextTick()
    expect(state.filteredFoods.value.some((food) => food.id === 'tsukemen')).toBe(false)
  })

  it('unlocks a parent variation reactively after a check-in', async () => {
    const state = mountComposable()

    await state.checkIn('ramen', 4)
    await nextTick()

    expect(state.visibleFoods.value.map((food) => food.id)).toContain('tsukemen')
    expect(state.visibleFoods.value.map((food) => food.id)).toContain('hiyashi-chuka')
    expect(state.lockedVariationCount.value).toBe(27)
  })

  it('unlocks Japanese mixed drink variations from the singular parent', async () => {
    const state = mountComposable()

    await state.checkIn('japanese-mixed-drink', 4)
    await nextTick()
    expect(state.visibleFoods.value.map((food) => food.id)).toEqual(expect.arrayContaining([
      'hoppy-set',
      'lemon-sour',
      'highball',
      'chuhai'
    ]))
    expect(state.lockedVariationCount.value).toBe(25)
  })

  it('uses the full catalog for progress after all essential foods are eaten', async () => {
    const state = mountComposable()

    for (const food of foods.filter((item) => item.essential)) await state.checkIn(food.id, 5)

    expect(state.progressCount.value).toBe(14)
    expect(state.progressTotal.value).toBe(116)
    expect(state.eatenCount.value).toBe(14)

    await state.checkIn('curry-udon', 4)
    expect(state.progressCount.value).toBe(15)
    expect(state.eatenCount.value).toBe(15)
  })

  it('restores saved eaten foods on mount', async () => {
    localStorage.setItem('pokedex-checkins', JSON.stringify([
      { id: 'one', foodId: 'sushi', eatenAt: '2026-09-06T10:00:00Z', rating: 4, location: '' },
      { id: 'two', foodId: 'onigiri', eatenAt: '2026-09-06T11:00:00Z', rating: 3, location: '' }
    ]))

    const state = mountComposable()
    await nextTick()

    expect(state.eatenFoods.value).toEqual(['sushi', 'onigiri'])
    expect(state.eatenCount.value).toBe(2)
  })

  it('surfaces progress-store load failures', async () => {
    const store = createLocalProgressStore()
    vi.spyOn(store, 'load').mockRejectedValue(new Error('Progress unavailable'))

    const state = mountComposableWithStore(foods, store)
    await nextTick()

    expect(state.syncError.value).toBe('Progress unavailable')
  })
})
