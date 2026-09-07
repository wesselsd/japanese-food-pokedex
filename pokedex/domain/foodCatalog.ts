import type { Food } from '~/data/foods'

export const CATEGORY_ORDER = ['Noodles', 'Rice & Bowls', 'Meat', 'Seafood', 'Dumplings & Buns', 'Sweets', 'Savory', 'Drinks']

export type FoodFilterOptions = {
  searchTerm: string
  selectedCategory: string
  selectedLabel: string
  eatenFilter: 'all' | 'eaten' | 'uneaten'
  eatenFoodIds: ReadonlySet<string>
}

export type FoodProgress = {
  eatenCount: number
  essentialCount: number
  eatenEssentialCount: number
  progressCount: number
  progressTotal: number
}

export function isFoodUnlocked(
  food: Food,
  foodById: ReadonlyMap<string, Food>,
  eatenFoodIds: ReadonlySet<string>,
  visited = new Set<string>()
) {
  if (!food.parentId) return true
  if (visited.has(food.id)) return false

  visited.add(food.id)
  const parent = foodById.get(food.parentId)
  return !!parent && eatenFoodIds.has(parent.id) && isFoodUnlocked(parent, foodById, eatenFoodIds, visited)
}

export function visibleFoods(foodList: Food[], eatenFoodIds: ReadonlySet<string>) {
  const foodById = new Map(foodList.map((food) => [food.id, food]))
  return foodList.filter((food) => isFoodUnlocked(food, foodById, eatenFoodIds))
}

export function lockedVariationCount(foodList: Food[], eatenFoodIds: ReadonlySet<string>) {
  const foodById = new Map(foodList.map((food) => [food.id, food]))
  return foodList.filter((food) => food.parentId && !isFoodUnlocked(food, foodById, eatenFoodIds)).length
}

export function filterFoods(foodList: Food[], options: FoodFilterOptions) {
  const search = options.searchTerm.trim().toLowerCase()

  return foodList.filter((food) => {
    const matchesSearch =
      !search ||
      food.name.toLowerCase().includes(search) ||
      food.japaneseName.includes(search) ||
      food.category.toLowerCase().includes(search) ||
      food.foodTypes.some((type) => type.toLowerCase().includes(search))

    const matchesEaten =
      options.eatenFilter === 'all' ||
      (options.eatenFilter === 'eaten' && options.eatenFoodIds.has(food.id)) ||
      (options.eatenFilter === 'uneaten' && !options.eatenFoodIds.has(food.id))

    const matchesLabel = options.selectedLabel === 'All' || food.foodTypes.includes(options.selectedLabel)

    return matchesSearch && matchesEaten &&
      (options.selectedCategory === 'All' || food.category === options.selectedCategory) &&
      matchesLabel
  })
}

export function catalogProgress(foodList: Food[], eatenFoodIds: ReadonlySet<string>): FoodProgress {
  const eatenCount = eatenFoodIds.size
  const essentialCount = foodList.filter((food) => food.essential).length
  const eatenEssentialCount = foodList.filter((food) => food.essential && eatenFoodIds.has(food.id)).length
  const essentialsComplete = eatenEssentialCount === essentialCount

  return {
    eatenCount,
    essentialCount,
    eatenEssentialCount,
    progressCount: essentialsComplete ? eatenCount : eatenEssentialCount,
    progressTotal: essentialsComplete ? foodList.length : essentialCount
  }
}
