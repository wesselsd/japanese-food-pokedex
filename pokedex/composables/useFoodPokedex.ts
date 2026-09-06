import { computed, ref, watch, type Ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import type { Checkin, ProgressAdapter } from '~/adapter/supabase/progress'
import type { Food } from '~/data/foods'

const EATEN_STORAGE_KEY = 'pokedex-eaten'
const PHOTOS_STORAGE_KEY = 'pokedex-photos'
const CHECKINS_STORAGE_KEY = 'pokedex-checkins'
const CROP_WIDTH = 320
const CROP_HEIGHT = 180
const OUTPUT_WIDTH = 640
const OUTPUT_HEIGHT = 360
const MAX_PHOTO_BYTES = 100 * 1024
const CATEGORY_ORDER = ['Noodles', 'Rice & Bowls', 'Meat', 'Seafood', 'Dumplings & Buns', 'Sweets', 'Savory', 'Drinks']
export type EatenFilter = 'all' | 'eaten' | 'uneaten'

type CropState = {
  foodId: string
  url: string
  width: number
  height: number
  offsetX: number
  offsetY: number
  zoom: number
}

export function useFoodPokedex(foodList: Food[], user: Readonly<Ref<User | null>>, cloudProgress: ProgressAdapter | null = null) {
  const checkins = ref<Checkin[]>([])
  const eatenFoods = computed(() => Array.from(new Set(checkins.value.map((checkin) => checkin.foodId))))
  const photos = ref<Record<string, string>>({})
  const searchTerm = ref('')
  const selectedCategory = ref('All')
  const selectedLabel = ref('All')
  const eatenFilter = ref<EatenFilter>('all')
  const syncError = ref('')
  const crop = ref<CropState | null>(null)

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

  async function checkIn(id: string, rating: number, location = '') {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.')
    const localCheckin = { id: crypto.randomUUID(), foodId: id, eatenAt: new Date().toISOString(), rating, location }
    if (user.value && cloudProgress) checkins.value = [...checkins.value, await cloudProgress.addCheckin(user.value.id, id, rating, location)]
    else checkins.value = [...checkins.value, localCheckin]
  }

  async function toggleEaten(id: string) {
    if (!eatenFoods.value.includes(id)) return checkIn(id, 5)
    checkins.value = checkins.value.filter((checkin) => checkin.foodId !== id)
  }

  async function updateCheckin(checkin: Checkin, rating: number, location: string) {
    const updated = { ...checkin, rating, location }
    if (user.value && cloudProgress) await cloudProgress.updateCheckin(user.value.id, updated)
    checkins.value = checkins.value.map((item) => item.id === checkin.id ? updated : item)
  }

  async function deleteCheckin(id: string) {
    const checkin = checkins.value.find((item) => item.id === id)
    if (!checkin) return
    if (user.value && cloudProgress) await cloudProgress.deleteCheckin(user.value.id, id)
    checkins.value = checkins.value.filter((item) => item.id !== id)
  }

  function savePhoto(id: string, event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const image = new Image()
    image.addEventListener('load', () => {
      const scale = Math.max(CROP_WIDTH / image.naturalWidth, CROP_HEIGHT / image.naturalHeight)
      crop.value = {
        foodId: id,
        url,
        width: image.naturalWidth * scale,
        height: image.naturalHeight * scale,
        offsetX: (CROP_WIDTH - image.naturalWidth * scale) / 2,
        offsetY: (CROP_HEIGHT - image.naturalHeight * scale) / 2,
        zoom: 1
      }
    })
    image.src = url
    input.value = ''
  }

  function moveCrop(deltaX: number, deltaY: number) {
    if (!crop.value) return
    crop.value.offsetX += deltaX
    crop.value.offsetY += deltaY
    const scale = crop.value.zoom
    const minX = CROP_WIDTH - crop.value.width * scale
    const minY = CROP_HEIGHT - crop.value.height * scale
    crop.value.offsetX = Math.min(0, Math.max(minX, crop.value.offsetX))
    crop.value.offsetY = Math.min(0, Math.max(minY, crop.value.offsetY))
  }

  function setCropZoom(zoom: number) {
    if (!crop.value) return
    const centerX = (CROP_WIDTH / 2 - crop.value.offsetX) / crop.value.zoom
    const centerY = (CROP_HEIGHT / 2 - crop.value.offsetY) / crop.value.zoom
    crop.value.zoom = zoom
    crop.value.offsetX = CROP_WIDTH / 2 - centerX * zoom
    crop.value.offsetY = CROP_HEIGHT / 2 - centerY * zoom
    moveCrop(0, 0)
  }

  function cancelCrop() {
    if (crop.value) URL.revokeObjectURL(crop.value.url)
    crop.value = null
  }

  async function confirmCrop() {
    if (!crop.value) return
    const currentCrop = crop.value
    const image = new Image()
    image.src = currentCrop.url
    await new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve())
      image.addEventListener('error', () => reject(new Error('Unable to read the selected image.')))
    })

    const scale = currentCrop.zoom * Math.max(CROP_WIDTH / image.naturalWidth, CROP_HEIGHT / image.naturalHeight)
    const sourceWidth = CROP_WIDTH / scale
    const sourceHeight = CROP_HEIGHT / scale
    const sourceX = -currentCrop.offsetX / scale
    const sourceY = -currentCrop.offsetY / scale
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_WIDTH
    canvas.height = OUTPUT_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to prepare the photo.')
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)

    let quality = 0.82
    let blob = await canvasToBlob(canvas, quality)
    while (blob.size > MAX_PHOTO_BYTES && quality > 0.35) {
      quality -= 0.08
      blob = await canvasToBlob(canvas, quality)
    }
    if (blob.size > MAX_PHOTO_BYTES) throw new Error('This crop could not be compressed below 100 KB.')

    const compressedFile = new File([blob], `${currentCrop.foodId}.jpg`, { type: 'image/jpeg' })
    const localUrl = URL.createObjectURL(compressedFile)
    photos.value = { ...photos.value, [currentCrop.foodId]: localUrl }
    if (user.value && cloudProgress) {
      try {
        const url = await cloudProgress.uploadPhoto(user.value.id, currentCrop.foodId, compressedFile)
        photos.value = { ...photos.value, [currentCrop.foodId]: url }
        URL.revokeObjectURL(localUrl)
      } catch (cause) {
        syncError.value = cause instanceof Error ? cause.message : 'Unable to save photo.'
      }
    } else {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        if (typeof reader.result === 'string') photos.value = { ...photos.value, [currentCrop.foodId]: reader.result }
        URL.revokeObjectURL(localUrl)
      })
      reader.readAsDataURL(compressedFile)
    }
    cancelCrop()
  }

  function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to compress the photo.')), 'image/jpeg', quality)
    })
  }

    watch(user, async (nextUser) => {
      if (!nextUser || !cloudProgress) {
        if (typeof window === 'undefined') return
        const savedEaten = localStorage.getItem(EATEN_STORAGE_KEY)
        const savedPhotos = localStorage.getItem(PHOTOS_STORAGE_KEY)
        const savedCheckins = localStorage.getItem(CHECKINS_STORAGE_KEY)
        if (savedEaten) eatenFoods.value = JSON.parse(savedEaten)
        if (savedPhotos) photos.value = JSON.parse(savedPhotos)
        if (savedCheckins) checkins.value = JSON.parse(savedCheckins)
        return
      }

      try {
        syncError.value = ''
        const cloudState = await cloudProgress.load(nextUser.id)
        checkins.value = cloudState.checkins
        photos.value = cloudState.photos
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

    return { checkins, eatenFoods, photos, searchTerm, selectedCategory, selectedLabel, eatenFilter, categories, labels, filteredFoods, eatenCount, checkIn, updateCheckin, deleteCheckin, toggleEaten, savePhoto, moveCrop, setCropZoom, cancelCrop, confirmCrop }
}
