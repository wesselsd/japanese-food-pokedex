import { describe, expect, it } from 'vitest'
import { foods } from '../data/foods'
import {
  catalogProgress,
  catalogInvariantErrors,
  categorySections,
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

  it('uses essentials first, then tracks only unlocked foods', () => {
    const catalog = [
      { id: 'essential', essential: true, parentId: undefined },
      { id: 'optional', essential: false, parentId: undefined },
      { id: 'variation', essential: false, parentId: 'optional' }
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
      progressTotal: 3
    })
    expect(catalogProgress(catalog, new Set(['essential', 'optional', 'variation']))).toMatchObject({
      progressCount: 3,
      progressTotal: 3
    })
  })

  it('reports the current catalog counts through the domain functions', () => {
    expect(catalogInvariantErrors(foods)).toEqual([])
    expect(visibleFoods(foods, new Set())).toHaveLength(87)
    expect(lockedVariationCount(foods, new Set())).toBe(29)
    expect(catalogProgress(foods, new Set())).toMatchObject({
      essentialCount: 14,
      progressTotal: 14
    })
  })

  it('reports duplicate identifiers and invalid parent references', () => {
      const invalidCatalog = [
        { id: 'one', number: '001', parentId: undefined },
        { id: 'one', number: '001', parentId: 'missing' },
        { id: 'three', number: '003', parentId: 'three' }
      ].map((food) => ({
        ...food,
        name: food.id,
        japaneseName: '',
        category: 'Test',
        essential: false,
        foodTypes: [],
        description: '',
        emoji: '',
        color: ''
      }))

      expect(catalogInvariantErrors(invalidCatalog)).toEqual([
        'Duplicate food id: one',
        'Duplicate food number: 001',
        'Missing parent missing for food one',
        'Food cannot be its own parent: three'
      ])
    })

  it('maps every catalog entry to display-name artwork', () => {
    const missingArtwork = foods.filter((food) => {
      const slug = food.name.toLowerCase().replace(/ /g, '-')
      return !food.image?.includes(`${encodeURIComponent(slug)}_image.`)
    }).map((food) => ({ name: food.name, image: food.image }))
    expect(missingArtwork).toEqual([])
  })

  it('builds category sections from filtered foods and eaten state', () => {
    const sections = categorySections(
      foods.filter((food) => food.category === 'Noodles'),
      visibleFoods(foods, new Set()),
      ['All', 'Noodles'],
      new Set(['ramen']),
      false
    )

    expect(sections).toEqual([expect.objectContaining({
      category: 'Noodles',
      totalCount: 6,
      eatenCount: 1
    })])
    expect(categorySections([], foods, ['All', 'Noodles'], new Set(), true)).toEqual([{
      category: '',
      foods: [],
      totalCount: 0,
      eatenCount: 0
    }])
  })
})
