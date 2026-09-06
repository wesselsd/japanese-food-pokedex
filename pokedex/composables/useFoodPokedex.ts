import { computed, ref, watch, type Ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import type { Checkin, FoodLocation, FoodPhoto, ProgressAdapter } from '~/adapter/supabase/progress'
import type { Food } from '~/data/foods'

const EATEN_STORAGE_KEY = 'pokedex-eaten'
const PHOTOS_STORAGE_KEY = 'pokedex-photos'
const CHECKINS_STORAGE_KEY = 'pokedex-checkins'
const CATEGORY_ORDER = ['Noodles', 'Rice & Bowls', 'Meat', 'Seafood', 'Dumplings & Buns', 'Sweets', 'Savory', 'Drinks']
export type EatenFilter = 'all' | 'eaten' | 'uneaten'

export function useFoodPokedex(foodList: Food[], user: Readonly<Ref<User | null>>, cloudProgress: ProgressAdapter | null = null) {
  const checkins = ref<Checkin[]>([])
  const eatenFoods = computed(() => Array.from(new Set(checkins.value.map((checkin) => checkin.foodId))))
  const photos = ref<Record<string, FoodPhoto[]>>({})
  const selectedPhotos = ref<Record<string, string>>({})
  const searchTerm = ref('')
  const selectedCategory = ref('All')
  const selectedLabel = ref('All')
  const eatenFilter = ref<EatenFilter>('all')
  const syncError = ref('')

  const categories = ['All', ...CATEGORY_ORDER]
  const labels = ['All', ...Array.from(new Set(foodList.flatMap((food) => food.foodTypes)))]
  const filteredFoods = computed(() => {
    const search = searchTerm.value.trim().toLowerCase()

    return foodList.filter((food) => {
      const matchesSearch =
        !search ||
        food.name.toLowerCase().includes(search) ||
        food.japaneseName.includes(search) ||
        food.category.toLowerCase().includes(search) ||
        food.foodTypes.some((type) => type.toLowerCase().includes(search))

      const matchesEaten =
        eatenFilter.value === 'all' ||
        (eatenFilter.value === 'eaten' && eatenFoods.value.includes(food.id)) ||
        (eatenFilter.value === 'uneaten' && !eatenFoods.value.includes(food.id))

      const matchesLabel = selectedLabel.value === 'All' || food.foodTypes.includes(selectedLabel.value)
      return matchesSearch && matchesEaten &&
        (selectedCategory.value === 'All' || food.category === selectedCategory.value) &&
        matchesLabel
    })
  })
  const eatenCount = computed(() => eatenFoods.value.length)
  const essentialCount = foodList.filter((food) => food.essential).length
  const eatenEssentialCount = computed(() => eatenFoods.value.filter((id) => foodList.some((food) => food.id === id && food.essential)).length)

  async function checkIn(id: string, rating: number, location = '', locationDetails?: FoodLocation) {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.')
    const localCheckin = { id: crypto.randomUUID(), foodId: id, eatenAt: new Date().toISOString(), rating, location, locationDetails }
    if (user.value && cloudProgress) checkins.value = [...checkins.value, await cloudProgress.addCheckin(user.value.id, id, rating, location, locationDetails)]
    else checkins.value = [...checkins.value, localCheckin]
  }

  async function toggleEaten(id: string) {
    if (!eatenFoods.value.includes(id)) return checkIn(id, 5)
    checkins.value = checkins.value.filter((checkin) => checkin.foodId !== id)
  }

  async function updateCheckin(checkin: Checkin, rating: number, location: string, locationDetails?: FoodLocation) {
    const updated = { ...checkin, rating, location, locationDetails }
    if (user.value && cloudProgress) await cloudProgress.updateCheckin(user.value.id, updated)
    checkins.value = checkins.value.map((item) => item.id === checkin.id ? updated : item)
  }

  async function deleteCheckin(id: string) {
    const checkin = checkins.value.find((item) => item.id === id)
    if (!checkin) return
    if (user.value && cloudProgress) await cloudProgress.deleteCheckin(user.value.id, id)
    checkins.value = checkins.value.filter((item) => item.id !== id)
  }

  async function compressPhoto(source: Blob): Promise<File> {
    const sourceUrl = URL.createObjectURL(source)
    const image = new Image()
    image.src = sourceUrl
    await new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => reject(new Error('Unable to process the selected image.')), { once: true })
    })
    URL.revokeObjectURL(sourceUrl)

    for (let maxDimension = 1600; maxDimension >= 320; maxDimension = Math.round(maxDimension * 0.8)) {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxDimension / image.naturalWidth)
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

      for (let quality = 0.85; quality >= 0.1; quality -= 0.05) {
        const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
        if (compressed && compressed.size <= 100 * 1024) return new File([compressed], 'food-photo.jpg', { type: 'image/jpeg' })
      }
    }
    throw new Error('This image could not be resized below 100KB. Please choose a smaller image.')
  }

  async function savePhoto(id: string, file: Blob) {
    const processedFile = await compressPhoto(file)
    const url = URL.createObjectURL(processedFile)
    const image = new Image()
    image.addEventListener('load', () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url)
        syncError.value = 'Unable to read the selected image.'
        return
      }
      const photoId = crypto.randomUUID()
      photos.value = { ...photos.value, [id]: [...(photos.value[id] ?? []), { id: photoId, url }] }
      selectedPhotos.value = { ...selectedPhotos.value, [id]: photoId }
      if (user.value && cloudProgress) {
        void cloudProgress.uploadPhoto(user.value.id, id, processedFile).then((photo) => {
          photos.value = { ...photos.value, [id]: [...(photos.value[id] ?? []).filter((item) => item.id !== photoId), photo] }
          selectedPhotos.value = { ...selectedPhotos.value, [id]: photo.id }
          URL.revokeObjectURL(url)
        }).catch((cause) => {
          syncError.value = cause instanceof Error ? cause.message : 'Unable to save photo.'
        })
      } else {
        const reader = new FileReader()
        reader.addEventListener('load', () => {
          if (typeof reader.result === 'string') photos.value = { ...photos.value, [id]: [...(photos.value[id] ?? []).filter((item) => item.id !== photoId), { id: photoId, url: reader.result }] }
          URL.revokeObjectURL(url)
        })
        reader.readAsDataURL(processedFile)
      }
    })
    image.src = url
  }

  async function removePhoto(foodId: string, photoId: string) {
    if (user.value && cloudProgress) await cloudProgress.deletePhoto(user.value.id, foodId, photoId)
    photos.value = { ...photos.value, [foodId]: (photos.value[foodId] ?? []).filter((photo) => photo.id !== photoId) }
    if (selectedPhotos.value[foodId] === photoId) {
      const next = photos.value[foodId]?.[0]
      if (next) await selectPhoto(foodId, next.id)
      else {
        const updated = { ...selectedPhotos.value }
        delete updated[foodId]
        selectedPhotos.value = updated
      }
    }
  }

  async function selectPhoto(foodId: string, photoId: string) {
    if (user.value && cloudProgress) await cloudProgress.selectPhoto(user.value.id, foodId, photoId)
    selectedPhotos.value = { ...selectedPhotos.value, [foodId]: photoId }
  }

    watch(user, async (nextUser) => {
      if (!nextUser || !cloudProgress) {
        if (typeof window === 'undefined') return
        const savedEaten = localStorage.getItem(EATEN_STORAGE_KEY)
        const savedPhotos = localStorage.getItem(PHOTOS_STORAGE_KEY)
        const savedCheckins = localStorage.getItem(CHECKINS_STORAGE_KEY)
        if (savedEaten) eatenFoods.value = JSON.parse(savedEaten)
        if (savedPhotos) {
          const saved = JSON.parse(savedPhotos) as Record<string, FoodPhoto[] | string>
          photos.value = Object.fromEntries(Object.entries(saved).map(([foodId, value]) => [foodId, typeof value === 'string' ? [{ id: 'legacy', url: value }] : value]))
          selectedPhotos.value = Object.fromEntries(Object.keys(photos.value).map((foodId) => [foodId, photos.value[foodId][0]?.id]).filter(([, id]) => id))
        }
        const savedSelectedPhotos = localStorage.getItem('pokedex-selected-photos')
        if (savedSelectedPhotos) selectedPhotos.value = { ...selectedPhotos.value, ...JSON.parse(savedSelectedPhotos) }
        if (savedCheckins) checkins.value = JSON.parse(savedCheckins)
        return
      }

      try {
        syncError.value = ''
        const cloudState = await cloudProgress.load(nextUser.id)
        checkins.value = cloudState.checkins
        photos.value = cloudState.photos
        selectedPhotos.value = cloudState.selectedPhotos
      } catch (cause) {
        syncError.value = cause instanceof Error ? cause.message : 'Unable to load saved progress.'
      }
    }, { immediate: true })

    watch(checkins, (value) => {
      if (!user.value && typeof window !== 'undefined') localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(value))
    }, { deep: true })
    watch(photos, (value) => {
      if (!user.value && typeof window !== 'undefined') localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(value))
    }, { deep: true })
    watch(selectedPhotos, (value) => {
      if (!user.value && typeof window !== 'undefined') localStorage.setItem('pokedex-selected-photos', JSON.stringify(value))
    }, { deep: true })

    return { checkins, eatenFoods, photos, selectedPhotos, searchTerm, selectedCategory, selectedLabel, eatenFilter, categories, labels, filteredFoods, eatenCount, essentialCount, eatenEssentialCount, checkIn, updateCheckin, deleteCheckin, toggleEaten, savePhoto, removePhoto, selectPhoto }
}
