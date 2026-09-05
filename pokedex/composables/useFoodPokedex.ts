import { computed, ref, watch, type Ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import type { ProgressAdapter } from '~/adapter/supabase/progress'
import type { Food } from '~/data/foods'

const EATEN_STORAGE_KEY = 'pokedex-eaten'
const PHOTOS_STORAGE_KEY = 'pokedex-photos'

export function useFoodPokedex(foodList: Food[], user: Readonly<Ref<User | null>>, cloudProgress: ProgressAdapter | null = null) {
  const eatenFoods = ref<string[]>([])
  const photos = ref<Record<string, string>>({})
  const searchTerm = ref('')
  const selectedCategory = ref('All')
  const syncError = ref('')

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

  async function toggleEaten(id: string) {
    const nextEaten = !eatenFoods.value.includes(id)
    eatenFoods.value = nextEaten
      ? [...eatenFoods.value, id]
      : eatenFoods.value.filter((foodId) => foodId !== id)
    if (user.value && cloudProgress) {
      try {
        await cloudProgress.setEaten(user.value.id, id, nextEaten)
      } catch (cause) {
        syncError.value = cause instanceof Error ? cause.message : 'Unable to save eaten status.'
      }
    }
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
      if (user.value && cloudProgress) {
        void cloudProgress.uploadPhoto(user.value.id, id, file)
          .then((url) => { photos.value = { ...photos.value, [id]: url } })
          .catch((cause) => { syncError.value = cause instanceof Error ? cause.message : 'Unable to save photo.' })
      }
    }

    watch(user, async (nextUser) => {
      if (!nextUser || !cloudProgress) {
        if (typeof window === 'undefined') return
        const savedEaten = localStorage.getItem(EATEN_STORAGE_KEY)
        const savedPhotos = localStorage.getItem(PHOTOS_STORAGE_KEY)
        if (savedEaten) eatenFoods.value = JSON.parse(savedEaten)
        if (savedPhotos) photos.value = JSON.parse(savedPhotos)
        return
      }

      try {
        syncError.value = ''
        const cloudState = await cloudProgress.load(nextUser.id)
        eatenFoods.value = cloudState.eatenFoods
        photos.value = cloudState.photos
      } catch (cause) {
        syncError.value = cause instanceof Error ? cause.message : 'Unable to load saved progress.'
      }
    }, { immediate: true })

    watch(eatenFoods, (value) => {
      if (!user.value && typeof window !== 'undefined') localStorage.setItem(EATEN_STORAGE_KEY, JSON.stringify(value))
    }, { deep: true })
    watch(photos, (value) => {
      if (!user.value && typeof window !== 'undefined') localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(value))
    }, { deep: true })

    return { eatenFoods, photos, searchTerm, selectedCategory, categories, filteredFoods, eatenCount, syncError, toggleEaten, savePhoto }
}
