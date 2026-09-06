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
  anmitsu: 'Sweets', 'melon-pan': 'Sweets', senbei: 'Sweets', unagi: 'Seafood',
  'curry-udon': 'Noodles', 'yaki-udon': 'Noodles', 'sara-udon': 'Noodles', tanmen: 'Noodles', champon: 'Noodles',
  unadon: 'Rice & Bowls', tekkadon: 'Rice & Bowls', 'soboro-don': 'Rice & Bowls', 'hayashi-rice': 'Rice & Bowls',
  uni: 'Seafood', ikura: 'Seafood', anago: 'Seafood', hotate: 'Seafood', hamachi: 'Seafood', kani: 'Seafood',
  korokke: 'Dumplings & Buns', 'menchi-katsu': 'Meat', 'ebi-fry': 'Seafood', tebasaki: 'Meat', tsukune: 'Meat',
  'grilled-squid': 'Seafood', 'potato-salad': 'Meat', 'japanese-omelette': 'Rice & Bowls',
  'pickled-vegetables': 'Sweets', 'mabo-tofu': 'Dumplings & Buns', imagawayaki: 'Sweets',
  'mitarashi-dango': 'Sweets', ningyoyaki: 'Sweets', yakiimo: 'Sweets', yakisoba: 'Noodles',
  yokan: 'Sweets', monaka: 'Sweets', 'mont-blanc': 'Sweets', 'japanese-pudding': 'Sweets',
  'matcha-ice-cream': 'Sweets', 'tamago-sando': 'Dumplings & Buns', 'yakisoba-pan': 'Dumplings & Buns',
  'japanese-cheesecake': 'Sweets', famichiki: 'Meat'
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
  , 'curry-udon': ['noodles', 'soup'], 'yaki-udon': ['noodles'], 'sara-udon': ['noodles'],
  tanmen: ['noodles', 'soup'], champon: ['noodles', 'seafood', 'soup'], unadon: ['seafood', 'rice'],
  tekkadon: ['seafood', 'raw', 'rice'], 'soboro-don': ['meat', 'egg', 'rice'], 'hayashi-rice': ['meat', 'rice'],
  uni: ['seafood', 'raw'], ikura: ['seafood', 'raw'], anago: ['seafood', 'raw'], hotate: ['seafood', 'raw'],
  hamachi: ['seafood', 'raw'], kani: ['seafood'], korokke: ['fried', 'vegetable'], 'menchi-katsu': ['meat', 'fried'],
  'ebi-fry': ['seafood', 'fried'], tebasaki: ['meat', 'fried'], tsukune: ['meat', 'grilled'],
  'grilled-squid': ['seafood', 'grilled'], 'potato-salad': ['vegetable'], 'japanese-omelette': ['egg'],
  'pickled-vegetables': ['vegetable'], 'mabo-tofu': ['tofu', 'meat'], imagawayaki: ['dessert', 'snack'],
  'mitarashi-dango': ['dessert'], ningyoyaki: ['dessert'], yakiimo: ['dessert', 'snack'],
  yakisoba: ['noodles', 'fried'], yokan: ['dessert'], monaka: ['dessert'], 'mont-blanc': ['dessert'],
  'japanese-pudding': ['dessert'], 'matcha-ice-cream': ['dessert'], 'tamago-sando': ['egg', 'snack'],
  'yakisoba-pan': ['noodles', 'snack'], 'japanese-cheesecake': ['dessert'], famichiki: ['meat', 'fried']
}

export const foods: Food[] = foodData.map((food) => ({
  ...food,
  category: categoryById[food.id] ?? 'Sweets',
  essential: essentialIds.has(food.id),
  foodTypes: foodTypesById[food.id] ?? ['snack'],
  image: imageForFood(food.name)
}))
