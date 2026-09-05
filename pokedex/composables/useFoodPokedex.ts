import { computed, onMounted, ref, watch } from 'vue'
import type { Food } from '~/data/foods'

const EATEN_STORAGE_KEY = 'pokedex-eaten'
const PHOTOS_STORAGE_KEY = 'pokedex-photos'

export function useFoodPokedex(foodList: Food[]) {
  const eatenFoods = ref<string[]>([])
  const photos = ref<Record<string, string>>({})
  const searchTerm = ref('')
  const selectedCategory = ref('All')

  const categories = ['All', ...new Set(foodList.map((food) => food.category))]
  const filteredFoods = computed(() => {
    const search = searchTerm.value.trim().toLowerCase()

    return foodList.filter((food) => {
      const matchesSearch =
        !search ||
        food.name.toLowerCase().includes(search) ||
        food.japaneseName.includes(search) ||
        food.category.toLowerCase().includes(search)

      return matchesSearch && (selectedCategory.value === 'All' || food.category === selectedCategory.value)
    })
  })
  const eatenCount = computed(() => eatenFoods.value.length)

  function toggleEaten(id: string) {
    eatenFoods.value = eatenFoods.value.includes(id)
      ? eatenFoods.value.filter((foodId) => foodId !== id)
      : [...eatenFoods.value, id]
  }

  function savePhoto(id: string, event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') photos.value = { ...photos.value, [id]: reader.result }
    })
    reader.readAsDataURL(file)
  }

  onMounted(() => {
    const savedEaten = localStorage.getItem(EATEN_STORAGE_KEY)
    const savedPhotos = localStorage.getItem(PHOTOS_STORAGE_KEY)
    if (savedEaten) eatenFoods.value = JSON.parse(savedEaten)
    if (savedPhotos) photos.value = JSON.parse(savedPhotos)
  })

  watch(eatenFoods, (value) => localStorage.setItem(EATEN_STORAGE_KEY, JSON.stringify(value)), { deep: true })
  watch(photos, (value) => localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(value)), { deep: true })

  return { eatenFoods, photos, searchTerm, selectedCategory, categories, filteredFoods, eatenCount, toggleEaten, savePhoto }
}
