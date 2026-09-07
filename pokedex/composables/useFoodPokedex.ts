import { computed, ref, watch, type Ref } from 'vue'
import type { Checkin, FoodLocation, FoodPhoto, ProgressStore } from '~/domain/progress'
import type { Food } from '~/data/foods'
import {
  CATEGORY_ORDER,
  catalogProgress,
  filterFoods,
  lockedVariationCount as getLockedVariationCount,
  visibleFoods as getVisibleFoods
} from '~/domain/foodCatalog'
import { compressImageToLimit } from '~/utils/imageProcessing'

export type EatenFilter = 'all' | 'eaten' | 'uneaten'

export function useFoodPokedex(foodList: Food[], progressStore: Readonly<Ref<ProgressStore | null>>) {
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
  const visibleFoods = computed(() => getVisibleFoods(foodList, new Set(eatenFoods.value)))
  const lockedVariationCount = computed(() => getLockedVariationCount(foodList, new Set(eatenFoods.value)))
  const filteredFoods = computed(() => filterFoods(visibleFoods.value, {
    searchTerm: searchTerm.value,
    selectedCategory: selectedCategory.value,
    selectedLabel: selectedLabel.value,
    eatenFilter: eatenFilter.value,
    eatenFoodIds: new Set(eatenFoods.value)
  }))
  const essentialCount = foodList.filter((food) => food.essential).length
  const progress = computed(() => catalogProgress(foodList, new Set(eatenFoods.value)))
  const eatenCount = computed(() => progress.value.eatenCount)
  const eatenEssentialCount = computed(() => progress.value.eatenEssentialCount)
  const progressCount = computed(() => progress.value.progressCount)
  const progressTotal = computed(() => progress.value.progressTotal)

  async function checkIn(id: string, rating: number, location = '', locationDetails?: FoodLocation) {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.')
    if (!progressStore.value) throw new Error('Progress storage is not available.')
    checkins.value = [...checkins.value, await progressStore.value.addCheckin(id, rating, location, locationDetails)]
  }

  async function toggleEaten(id: string) {
    if (!eatenFoods.value.includes(id)) return checkIn(id, 5)
    await Promise.all(checkins.value.filter((checkin) => checkin.foodId === id).map((checkin) => deleteCheckin(checkin.id)))
  }

  async function updateCheckin(checkin: Checkin, rating: number, location: string, locationDetails?: FoodLocation) {
    const updated = { ...checkin, rating, location, locationDetails }
    if (!progressStore.value) throw new Error('Progress storage is not available.')
    await progressStore.value.updateCheckin(updated)
    checkins.value = checkins.value.map((item) => item.id === checkin.id ? updated : item)
  }

  async function deleteCheckin(id: string) {
    const checkin = checkins.value.find((item) => item.id === id)
    if (!checkin) return
    if (!progressStore.value) throw new Error('Progress storage is not available.')
    await progressStore.value.deleteCheckin(id)
    checkins.value = checkins.value.filter((item) => item.id !== id)
  }

  async function savePhoto(id: string, file: Blob) {
    const processedFile = await compressImageToLimit(file)
    if (!progressStore.value) throw new Error('Progress storage is not available.')
    const photo = await progressStore.value.uploadPhoto(id, processedFile)
    photos.value = { ...photos.value, [id]: [...(photos.value[id] ?? []), photo] }
    selectedPhotos.value = { ...selectedPhotos.value, [id]: photo.id }
  }

  async function removePhoto(foodId: string, photoId: string) {
    if (!progressStore.value) throw new Error('Progress storage is not available.')
    await progressStore.value.deletePhoto(foodId, photoId)
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
    if (!progressStore.value) throw new Error('Progress storage is not available.')
    await progressStore.value.selectPhoto(foodId, photoId)
    selectedPhotos.value = { ...selectedPhotos.value, [foodId]: photoId }
  }

  watch(progressStore, async (nextStore) => {
    if (!nextStore) return
    try {
      syncError.value = ''
      const savedState = await nextStore.load()
      checkins.value = savedState.checkins
      photos.value = savedState.photos
      selectedPhotos.value = savedState.selectedPhotos
    } catch (cause) {
      syncError.value = cause instanceof Error ? cause.message : 'Unable to load saved progress.'
    }
  }, { immediate: true })

  return {
    checkins,
    eatenFoods,
    photos,
    selectedPhotos,
    searchTerm,
    selectedCategory,
    selectedLabel,
    eatenFilter,
    categories,
    labels,
    visibleFoods,
    lockedVariationCount,
    filteredFoods,
    eatenCount,
    essentialCount,
    eatenEssentialCount,
    progressCount,
    progressTotal,
    syncError,
    checkIn,
    updateCheckin,
    deleteCheckin,
    toggleEaten,
    savePhoto,
    removePhoto,
    selectPhoto
  }
}
