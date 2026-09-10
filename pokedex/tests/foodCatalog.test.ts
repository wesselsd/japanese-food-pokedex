import { describe, expect, it } from 'vitest'
import { foods } from '../data/foods'
import {
  catalogProgress,
  catalogInvariantErrors,
  categorySections,
  evolutionGroups,
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

  it('matches names with or without macrons', () => {
    const filterOptions = (searchTerm: string) => filterFoods(foods, {
      searchTerm,
      selectedCategory: 'All',
      selectedLabel: 'All',
      eatenFilter: 'all',
      eatenFoodIds: new Set()
    }).map((food) => food.id)

    expect(filterOptions('gyudon')).toContain('gyudon')
    expect(filterOptions('gyutan')).toContain('grilled-gyutan')
    expect(filterOptions('chuhai')).toContain('chuhai')
    expect(filterOptions('shabushabu')).toContain('shabu-shabu')
    expect(filterOptions('yaki udon')).toContain('yaki-udon')
    expect(filterOptions('shochu')).toEqual(expect.arrayContaining([
      'shochu',
      'imo-shochu',
      'mugi-shochu'
    ]))
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

  it('preserves catalog invariants and essential-first progress behavior', () => {
    expect(catalogInvariantErrors(foods)).toEqual([])
    const visible = visibleFoods(foods, new Set())
    expect(visible.some((food) => food.id === 'ramen')).toBe(true)
    expect(visible.some((food) => food.id === 'tsukemen')).toBe(false)
    expect(lockedVariationCount(foods, new Set())).toBeGreaterThan(0)

    const progress = catalogProgress(foods, new Set())
    expect(progress.essentialCount).toBeGreaterThan(0)
    expect(progress.progressTotal).toBe(progress.essentialCount)
  })

  it('uses the chosen discovery hierarchy for dish variations', () => {
    const parentById = new Map(foods.map((food) => [food.id, food.parentId]))

    expect(Object.fromEntries([
      'katsudon',
      'tendon',
      'kaisendon',
      'tekkadon',
      'tanmen'
    ].map((id) => [id, parentById.get(id)]))).toEqual({
      katsudon: 'tonkatsu',
      tendon: 'tempura',
      kaisendon: 'sushi',
      tekkadon: 'sushi',
      tanmen: 'ramen'
    })
  })

  it('groups every root with all descendant evolutions in catalog order', () => {
    const catalog = [
      { id: 'root', parentId: undefined },
      { id: 'second', parentId: 'root' },
      { id: 'other-root', parentId: undefined },
      { id: 'third', parentId: 'second' },
      { id: 'sibling', parentId: 'root' }
    ].map((food, index) => ({
      ...food,
      number: String(index),
      name: food.id,
      japaneseName: '',
      category: 'Test',
      essential: false,
      foodTypes: [],
      description: '',
      emoji: '',
      color: ''
    }))

    expect(evolutionGroups(catalog).map((group) => ({
      root: group.root.id,
      evolutions: group.evolutions.map((food) => food.id)
    }))).toEqual([
      { root: 'root', evolutions: ['second', 'third', 'sibling'] },
      { root: 'other-root', evolutions: [] }
    ])
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
      return !food.image?.includes(`/thumbnails/${encodeURIComponent(slug)}.`)
        || !food.image.endsWith('.webp')
    }).map((food) => ({ name: food.name, image: food.image }))
    expect(missingArtwork).toEqual([])
  })

  it('builds category sections from filtered foods and eaten state', () => {
    const visible = visibleFoods(foods, new Set())
    const sections = categorySections(
      visible.filter((food) => food.category === 'Noodles'),
      visible,
      ['All', 'Noodles'],
      new Set(['ramen']),
      false
    )

    expect(sections).toHaveLength(1)
    expect(sections[0].category).toBe('Noodles')
    expect(sections[0].foods.map((food) => food.id)).toContain('udon')
    expect(sections[0].foods.map((food) => food.id)).not.toContain('tanmen')
    expect(sections[0].eatenCount).toBeGreaterThan(0)
    expect(sections[0].totalCount).toBeGreaterThanOrEqual(sections[0].foods.length)
    expect(categorySections([], foods, ['All', 'Noodles'], new Set(), true)).toEqual([{
      category: '',
      foods: [],
      totalCount: 0,
      eatenCount: 0
    }])
  })
})
