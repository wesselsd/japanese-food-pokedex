import { describe, expect, it } from 'vitest'
import { foods } from '../data/foods'
import {
  catalogProgress,
  filterFoods,
  isFoodUnlocked,
  lockedVariationCount,
  visibleFoods
} from '../domain/foodCatalog'

describe('food catalog domain rules', () => {
  it('unlocks a child only when every ancestor has been eaten', () => {
    const catalog = [
      { id: 'root', parentId: undefined },
      { id: 'child', parentId: 'root' },
      { id: 'grandchild', parentId: 'child' }
    ].map((food) => ({
      ...food,
      number: food.id,
      name: food.id,
      japaneseName: food.id,
      category: 'Test',
      essential: false,
      foodTypes: [],
      description: '',
      emoji: '',
      color: ''
    }))
    const foodById = new Map(catalog.map((food) => [food.id, food]))

    expect(isFoodUnlocked(catalog[2], foodById, new Set())).toBe(false)
    expect(isFoodUnlocked(catalog[2], foodById, new Set(['root']))).toBe(false)
    expect(isFoodUnlocked(catalog[2], foodById, new Set(['root', 'child']))).toBe(true)
  })

  it('keeps missing parents and cycles locked', () => {
    const catalog = [
      {
        id: 'missing-parent',
        parentId: 'missing',
        number: '1',
        name: 'Missing',
        japaneseName: '',
        category: 'Test',
        essential: false,
        foodTypes: [],
        description: '',
        emoji: '',
        color: ''
      },
      {
        id: 'cycle-a',
        parentId: 'cycle-b',
        number: '2',
        name: 'Cycle A',
        japaneseName: '',
        category: 'Test',
        essential: false,
        foodTypes: [],
        description: '',
        emoji: '',
        color: ''
      },
      {
        id: 'cycle-b',
        parentId: 'cycle-a',
        number: '3',
        name: 'Cycle B',
        japaneseName: '',
        category: 'Test',
        essential: false,
        foodTypes: [],
        description: '',
        emoji: '',
        color: ''
      }
    ]

    expect(visibleFoods(catalog, new Set())).toEqual([])
  })

  it('filters only foods that are already visible', () => {
    const visible = visibleFoods(foods, new Set())
    const filtered = filterFoods(visible, {
      searchTerm: 'tsukemen',
      selectedCategory: 'All',
      selectedLabel: 'All',
      eatenFilter: 'all',
      eatenFoodIds: new Set()
    })

    expect(filtered).toEqual([])
  })

  it('calculates essential-first progress before switching to the full catalog', () => {
    const catalog = [
      { id: 'essential', essential: true, parentId: undefined },
      { id: 'optional', essential: false, parentId: undefined }
    ].map((food, index) => ({
      ...food,
      number: String(index),
      name: food.id,
      japaneseName: '',
      category: 'Test',
      foodTypes: [],
      description: '',
      emoji: '',
      color: ''
    }))

    expect(catalogProgress(catalog, new Set())).toMatchObject({
      eatenCount: 0,
      essentialCount: 1,
      eatenEssentialCount: 0,
      progressCount: 0,
      progressTotal: 1
    })
    expect(catalogProgress(catalog, new Set(['essential', 'optional']))).toMatchObject({
      progressCount: 2,
      progressTotal: 2
    })
  })

  it('reports the current catalog counts through the domain functions', () => {
    expect(visibleFoods(foods, new Set())).toHaveLength(87)
    expect(lockedVariationCount(foods, new Set())).toBe(29)
    expect(catalogProgress(foods, new Set())).toMatchObject({
      essentialCount: 14,
      progressTotal: 14
    })
  })
})
