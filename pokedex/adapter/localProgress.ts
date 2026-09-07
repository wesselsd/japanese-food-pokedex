import type {
  Checkin,
  FoodPhoto,
  ProgressState,
  ProgressStore
} from '~/domain/progress'

const EATEN_STORAGE_KEY = 'pokedex-eaten'
const PHOTOS_STORAGE_KEY = 'pokedex-photos'
const CHECKINS_STORAGE_KEY = 'pokedex-checkins'
const SELECTED_PHOTOS_STORAGE_KEY = 'pokedex-selected-photos'

function storageOrNull(storage?: Storage) {
  return storage ?? (typeof window === 'undefined' ? null : window.localStorage)
}

function parseStorage<T>(storage: Storage, key: string, fallback: T): T {
  const value = storage.getItem(key)
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch (cause) {
    throw new Error(`Unable to read saved progress from ${key}.`, { cause })
  }
}

function readPhotos(storage: Storage) {
  const saved = parseStorage<Record<string, FoodPhoto[] | string>>(storage, PHOTOS_STORAGE_KEY, {})
  return Object.fromEntries(Object.entries(saved).map(([foodId, value]) => [
    foodId,
    typeof value === 'string' ? [{ id: 'legacy', url: value }] : value
  ]))
}

function dataUrlFromFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Unable to read the selected image.'))
    }, { once: true })
    reader.addEventListener('error', () => reject(new Error('Unable to read the selected image.')), { once: true })
    reader.readAsDataURL(file)
  })
}

export function createLocalProgressStore(storage?: Storage): ProgressStore {
  const target = storageOrNull(storage)
  let state: ProgressState = { checkins: [], photos: {}, selectedPhotos: {} }
  let loaded = false

  function persist() {
    if (!target) return
    target.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(state.checkins))
    target.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(state.photos))
    target.setItem(SELECTED_PHOTOS_STORAGE_KEY, JSON.stringify(state.selectedPhotos))
  }

  async function ensureLoaded() {
    if (loaded) return
    if (target) {
      const savedCheckins = parseStorage<Checkin[]>(target, CHECKINS_STORAGE_KEY, [])
      const savedEaten = parseStorage<string[]>(target, EATEN_STORAGE_KEY, [])
      const savedPhotos = readPhotos(target)
      const savedSelectedPhotos = parseStorage<Record<string, string>>(target, SELECTED_PHOTOS_STORAGE_KEY, {})
      const legacyCheckins = savedEaten
        .filter((foodId) => !savedCheckins.some((checkin) => checkin.foodId === foodId))
        .map((foodId) => ({
          id: `legacy-${foodId}`,
          foodId,
          eatenAt: new Date(0).toISOString(),
          rating: 5,
          location: ''
        }))

      state = {
        checkins: [...savedCheckins, ...legacyCheckins],
        photos: savedPhotos,
        selectedPhotos: {
          ...Object.fromEntries(Object.entries(savedPhotos).map(([foodId, photos]) => [foodId, photos[0]?.id]).filter(([, id]) => id)),
          ...savedSelectedPhotos
        }
      }
    }
    loaded = true
  }

  return {
    async load() {
      await ensureLoaded()
      return state
    },

    async addCheckin(foodId, rating, location, locationDetails) {
      await ensureLoaded()
      const checkin: Checkin = {
        id: crypto.randomUUID(),
        foodId,
        eatenAt: new Date().toISOString(),
        rating,
        location,
        locationDetails
      }
      state.checkins = [...state.checkins, checkin]
      persist()
      return checkin
    },

    async updateCheckin(checkin) {
      await ensureLoaded()
      state.checkins = state.checkins.map((item) => item.id === checkin.id ? checkin : item)
      persist()
    },

    async deleteCheckin(checkinId) {
      await ensureLoaded()
      state.checkins = state.checkins.filter((checkin) => checkin.id !== checkinId)
      persist()
    },

    async uploadPhoto(foodId, file) {
      await ensureLoaded()
      const photo: FoodPhoto = { id: crypto.randomUUID(), url: await dataUrlFromFile(file) }
      state.photos = { ...state.photos, [foodId]: [...(state.photos[foodId] ?? []), photo] }
      state.selectedPhotos = { ...state.selectedPhotos, [foodId]: photo.id }
      persist()
      return photo
    },

    async deletePhoto(foodId, photoId) {
      await ensureLoaded()
      const photos = (state.photos[foodId] ?? []).filter((photo) => photo.id !== photoId)
      const selectedPhotos = { ...state.selectedPhotos }
      if (selectedPhotos[foodId] === photoId) {
        if (photos[0]) selectedPhotos[foodId] = photos[0].id
        else delete selectedPhotos[foodId]
      }
      state.photos = { ...state.photos, [foodId]: photos }
      state.selectedPhotos = selectedPhotos
      persist()
    },

    async selectPhoto(foodId, photoId) {
      await ensureLoaded()
      state.selectedPhotos = { ...state.selectedPhotos, [foodId]: photoId }
      persist()
    }
  }
}
