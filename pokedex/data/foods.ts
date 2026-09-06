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
