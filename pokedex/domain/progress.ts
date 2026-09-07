export type FoodLocation = {
  placeId: string
  name: string
  address: string
  latitude: number
  longitude: number
  mapsUrl: string
}

export type Checkin = {
  id: string
  foodId: string
  eatenAt: string
  rating: number
  location: string
  locationDetails?: FoodLocation
}

export type FoodPhoto = {
  id: string
  url: string
}

export type ProgressState = {
  checkins: Checkin[]
  photos: Record<string, FoodPhoto[]>
  selectedPhotos: Record<string, string>
}

export type ProgressStore = {
  load: () => Promise<ProgressState>
  addCheckin: (foodId: string, rating: number, location: string, locationDetails?: FoodLocation) => Promise<Checkin>
  updateCheckin: (checkin: Checkin) => Promise<void>
  deleteCheckin: (checkinId: string) => Promise<void>
  uploadPhoto: (foodId: string, file: File) => Promise<FoodPhoto>
  deletePhoto: (foodId: string, photoId: string) => Promise<void>
  selectPhoto: (foodId: string, photoId: string) => Promise<void>
}
