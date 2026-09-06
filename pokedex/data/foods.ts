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
  categories: string[]
  description: string
  emoji: string
  color: string
  image?: string
}

function imageForFood(id: string) {
  return imageModules[`../assets/images/${id}_image.png`]
}

export const foods: Food[] = foodData.map((food) => ({
  ...food,
  image: imageForFood(food.id)
}))
