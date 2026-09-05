import { computed, ref, watch, type Ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import type { ProgressAdapter } from '~/adapter/supabase/progress'
import type { Food } from '~/data/foods'

const EATEN_STORAGE_KEY = 'pokedex-eaten'
const PHOTOS_STORAGE_KEY = 'pokedex-photos'
const CROP_WIDTH = 320
const CROP_HEIGHT = 180
const OUTPUT_WIDTH = 640
const OUTPUT_HEIGHT = 360
const MAX_PHOTO_BYTES = 100 * 1024

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
  const eatenFoods = ref<string[]>([])
  const photos = ref<Record<string, string>>({})
  const searchTerm = ref('')
  const selectedCategory = ref('All')
  const syncError = ref('')
  const crop = ref<CropState | null>(null)

  const categories = ['All', ...new Set(foodList.flatMap((food) => food.categories))]
  const filteredFoods = computed(() => {
    const search = searchTerm.value.trim().toLowerCase()

    return foodList.filter((food) => {
      const matchesSearch =
        !search ||
        food.name.toLowerCase().includes(search) ||
        food.japaneseName.includes(search) ||
        food.categories.some((category) => category.toLowerCase().includes(search))

      return matchesSearch && (selectedCategory.value === 'All' || food.categories.includes(selectedCategory.value))
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

    return { eatenFoods, photos, searchTerm, selectedCategory, categories, filteredFoods, eatenCount, syncError, crop, toggleEaten, savePhoto, moveCrop, setCropZoom, cancelCrop, confirmCrop }
}
