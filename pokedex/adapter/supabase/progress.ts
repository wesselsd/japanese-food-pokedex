import type { SupabaseClient } from '@supabase/supabase-js'

export type CloudProgress = {
  checkins: Checkin[]
  photos: Record<string, FoodPhoto[]>
  selectedPhotos: Record<string, string>
}

export type FoodLocation = { placeId: string; name: string; address: string; latitude: number; longitude: number; mapsUrl: string }
export type Checkin = { id: string; foodId: string; eatenAt: string; rating: number; location: string; locationDetails?: FoodLocation }
export type FoodPhoto = { id: string; url: string }

export type ProgressAdapter = {
  load: (userId: string) => Promise<CloudProgress>
  addCheckin: (userId: string, foodId: string, rating: number, location: string, locationDetails?: FoodLocation) => Promise<Checkin>
  updateCheckin: (userId: string, checkin: Checkin) => Promise<void>
  deleteCheckin: (userId: string, checkinId: string) => Promise<void>
  uploadPhoto: (userId: string, foodId: string, file: File) => Promise<FoodPhoto>
  deletePhoto: (userId: string, foodId: string, photoId: string) => Promise<void>
  selectPhoto: (userId: string, foodId: string, photoId: string) => Promise<void>
}

const BUCKET = 'food-photos'

export function createSupabaseProgressAdapter(client: SupabaseClient): ProgressAdapter {
  async function load(userId: string): Promise<CloudProgress> {
    const { data, error } = await client
      .from('user_foods')
      .select('food_id, photo_path, selected_photo_id')
      .eq('user_id', userId)

    if (error) throw error

    const photos: Record<string, FoodPhoto[]> = {}
    const selectedPhotos: Record<string, string> = {}
    const { data: checkinData, error: checkinError } = await client.from('user_food_checkins').select('id, food_id, eaten_at, rating, location, location_details').eq('user_id', userId)
    if (checkinError) throw checkinError
    await Promise.all(
      data
        .filter((row) => row.photo_path)
        .map(async (row) => {
          const { data: signedUrl, error: signedUrlError } = await client.storage
            .from(BUCKET)
            .createSignedUrl(row.photo_path, 3600)
          if (signedUrlError) throw signedUrlError
          photos[row.food_id] = [{ id: row.photo_path, url: signedUrl.signedUrl }]
          selectedPhotos[row.food_id] = row.selected_photo_id ?? row.photo_path
        })
    )
    const { data: photoRows, error: photoError } = await client.from('user_food_photos').select('id, food_id, photo_path').eq('user_id', userId)
    if (photoError) throw photoError
    await Promise.all(photoRows.map(async (row) => {
      const { data: signedUrl, error: signedUrlError } = await client.storage.from(BUCKET).createSignedUrl(row.photo_path, 3600)
      if (signedUrlError) throw signedUrlError
      photos[row.food_id] = [...(photos[row.food_id] ?? []).filter((photo) => photo.id !== row.id), { id: row.id, url: signedUrl.signedUrl }]
    }))

    return {
      checkins: checkinData.map((row) => ({ id: row.id, foodId: row.food_id, eatenAt: row.eaten_at, rating: row.rating, location: row.location ?? '', locationDetails: row.location_details ?? undefined })),
      photos,
      selectedPhotos
    }
  }

  async function addCheckin(userId: string, foodId: string, rating: number, location: string, locationDetails?: FoodLocation) {
    const { data, error } = await client.from('user_food_checkins').insert({ user_id: userId, food_id: foodId, rating, location: location || null, location_details: locationDetails ?? null }).select('id, food_id, eaten_at, rating, location, location_details').single()
    if (error) throw error
    return { id: data.id, foodId: data.food_id, eatenAt: data.eaten_at, rating: data.rating, location: data.location ?? '', locationDetails: data.location_details ?? undefined }
  }

  async function updateCheckin(userId: string, checkin: Checkin) {
    const { error } = await client.from('user_food_checkins').update({ rating: checkin.rating, location: checkin.location || null, location_details: checkin.locationDetails ?? null }).eq('id', checkin.id).eq('user_id', userId)
    if (error) throw error
  }

  async function deleteCheckin(userId: string, checkinId: string) {
    const { error } = await client.from('user_food_checkins').delete().eq('id', checkinId).eq('user_id', userId)
    if (error) throw error
  }

  async function uploadPhoto(userId: string, foodId: string, file: File) {
    const photoId = crypto.randomUUID()
    const path = `${userId}/${foodId}/${photoId}.jpg`
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { error: progressError } = await client.from('user_food_photos').insert({ id: photoId, user_id: userId, food_id: foodId, photo_path: path })
    if (progressError) throw progressError

    const { data, error: signedUrlError } = await client.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (signedUrlError) throw signedUrlError
    return { id: photoId, url: data.signedUrl }
  }

  async function deletePhoto(userId: string, foodId: string, photoId: string) {
    if (photoId.includes('/')) {
      const { error: storageError } = await client.storage.from(BUCKET).remove([photoId])
      if (storageError) throw storageError
      const { error } = await client.from('user_foods').delete().eq('user_id', userId).eq('food_id', foodId).eq('photo_path', photoId)
      if (error) throw error
      return
    }
    const { data: row, error: lookupError } = await client.from('user_food_photos').select('photo_path').eq('id', photoId).eq('user_id', userId).eq('food_id', foodId).single()
    if (lookupError) throw lookupError
    const { error: storageError } = await client.storage.from(BUCKET).remove([row.photo_path])
    if (storageError) throw storageError
    const { error } = await client.from('user_food_photos').delete().eq('id', photoId).eq('user_id', userId)
    if (error) throw error
  }

  async function selectPhoto(userId: string, foodId: string, photoId: string) {
    const { error } = await client.from('user_foods').upsert({ user_id: userId, food_id: foodId, selected_photo_id: photoId === 'default' ? null : photoId })
    if (error) throw error
  }

  return { load, addCheckin, updateCheckin, deleteCheckin, uploadPhoto, deletePhoto, selectPhoto }
}
