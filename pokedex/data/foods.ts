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

function imageForFood(id: string) {
  return imageModules[`../assets/images/${id}_image.png`]
}

const essentialIds = new Set([
  'sushi', 'ramen', 'yakiniku', 'yakitori', 'tonkatsu', 'tempura',
  'curry-rice', 'gyudon', 'soba', 'wagashi', 'okonomiyaki', 'kakigori',
  'unagi', 'ekiben'
])

const categoryById: Record<string, string> = {
  ramen: 'Noodles', soba: 'Noodles', udon: 'Noodles', tsukemen: 'Noodles', 'hiyashi-chuka': 'Noodles',
  sushi: 'Seafood', tempura: 'Seafood', takoyaki: 'Seafood', shumai: 'Dumplings & Buns', kaisendon: 'Seafood',
  tonkatsu: 'Meat', karaage: 'Meat', yakitori: 'Meat', 'chicken-nanban': 'Meat', kushikatsu: 'Meat',
  sukiyaki: 'Meat', 'shabu-shabu': 'Meat', gyutan: 'Meat', motsunabe: 'Meat', yakiniku: 'Meat',
  katsudon: 'Rice & Bowls', gyudon: 'Rice & Bowls', oyakodon: 'Rice & Bowls', tendon: 'Rice & Bowls',
  omurice: 'Rice & Bowls', ochazuke: 'Rice & Bowls', 'takikomi-gohan': 'Rice & Bowls', 'curry-rice': 'Rice & Bowls',
  'katsu-curry': 'Rice & Bowls', chahan: 'Rice & Bowls', onigiri: 'Rice & Bowls', ekiben: 'Rice & Bowls',
  'curry-pan': 'Dumplings & Buns', gyoza: 'Dumplings & Buns', nikuman: 'Dumplings & Buns',
  edamame: 'Meat', 'agedashi-tofu': 'Meat', nikujaga: 'Meat', wagashi: 'Sweets', matcha: 'Sweets',
  taiyaki: 'Sweets', dango: 'Sweets', kakigori: 'Sweets', mochi: 'Sweets', daifuku: 'Sweets',
  'ichigo-daifuku': 'Sweets', 'warabi-mochi': 'Sweets', dorayaki: 'Sweets', castella: 'Sweets',
  anmitsu: 'Sweets', 'melon-pan': 'Sweets', senbei: 'Sweets', unagi: 'Seafood'
}

const foodTypesById: Record<string, string[]> = {
  ramen: ['noodles', 'soup'], sushi: ['seafood', 'raw'], okonomiyaki: ['egg', 'fried'],
  onigiri: ['rice', 'snack'], takoyaki: ['seafood', 'fried', 'snack'], matcha: ['dessert'],
  soba: ['noodles'], udon: ['noodles', 'soup'], tsukemen: ['noodles', 'soup'],
  'hiyashi-chuka': ['noodles'], tempura: ['seafood', 'fried'], tonkatsu: ['meat', 'fried'],
  karaage: ['meat', 'fried'], yakitori: ['meat', 'grilled'], 'chicken-nanban': ['meat', 'fried'],
  kushikatsu: ['meat', 'fried'], sukiyaki: ['meat', 'soup'], 'shabu-shabu': ['meat', 'soup'],
  gyutan: ['meat', 'grilled'], motsunabe: ['meat', 'soup'], katsudon: ['meat', 'rice'],
  gyudon: ['meat', 'rice'], oyakodon: ['meat', 'egg', 'rice'], tendon: ['seafood', 'fried', 'rice'],
  kaisendon: ['seafood', 'raw', 'rice'], omurice: ['egg', 'rice'], ochazuke: ['rice', 'soup'],
  'takikomi-gohan': ['rice'], 'curry-rice': ['meat', 'rice'], 'katsu-curry': ['meat', 'fried', 'rice'],
  'curry-pan': ['fried', 'snack'], gyoza: ['meat', 'fried'], chahan: ['rice', 'egg'],
  nikuman: ['meat'], shumai: ['meat'], edamame: ['vegetable', 'snack'], 'agedashi-tofu': ['tofu', 'fried'],
  nikujaga: ['meat', 'vegetable', 'soup'], taiyaki: ['dessert', 'snack'], dango: ['dessert'],
  kakigori: ['dessert'], mochi: ['dessert'], daifuku: ['dessert'], 'ichigo-daifuku': ['dessert'],
  'warabi-mochi': ['dessert'], dorayaki: ['dessert'], castella: ['dessert'], anmitsu: ['dessert'],
  'melon-pan': ['snack'], senbei: ['snack'], yakiniku: ['meat', 'grilled'], wagashi: ['dessert'],
  unagi: ['seafood', 'grilled'], ekiben: ['rice', 'snack']
}

export const foods: Food[] = foodData.map((food) => ({
  ...food,
  category: categoryById[food.id] ?? 'Sweets',
  essential: essentialIds.has(food.id),
  foodTypes: foodTypesById[food.id] ?? ['snack'],
  image: imageForFood(food.id)
}))
