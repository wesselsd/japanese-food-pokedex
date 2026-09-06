import foodData from './foods.json'

const imageModules = import.meta.glob('../assets/images/*_image.png', {
  eager: true,
  import: 'default',
  query: '?url'
}) as Record<string, string>

export type Food = {
  id: string
  number: string
  name: string
  japaneseName: string
  category: string
  essential: boolean
  foodTypes: string[]
  description: string
  emoji: string
  color: string
  image?: string
}

export function foodLabels(food: Food) {
  const types = food.category === 'Rice & Bowls'
    ? food.foodTypes.filter((label) => label.toLowerCase() !== 'rice')
    : food.foodTypes
  return [...new Set([food.category, ...types].map((label) => label.toLowerCase()))]
    .map((label) => {
      const displayLabel = [food.category, ...types].find((value) => value.toLowerCase() === label) ?? label
      return displayLabel === food.category
        ? displayLabel
        : displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1)
    })
}

function imageSlugForName(name: string) {
  return name.toLowerCase().replace(/ /g, '-')
}

function imageForFood(name: string) {
  return imageModules[`../assets/images/${imageSlugForName(name)}_image.png`]
}

export const foods: Food[] = foodData.map((food) => ({
  ...food,
  image: imageForFood(food.name)
}))
