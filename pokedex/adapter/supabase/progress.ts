import type { SupabaseClient } from '@supabase/supabase-js'

export type CloudProgress = {
  checkins: Checkin[]
  photos: Record<string, string>
}

export type Checkin = { id: string; foodId: string; eatenAt: string; rating: number; location: string }

export type ProgressAdapter = {
  load: (userId: string) => Promise<CloudProgress>
  addCheckin: (userId: string, foodId: string, rating: number, location: string) => Promise<Checkin>
  updateCheckin: (userId: string, checkin: Checkin) => Promise<void>
  deleteCheckin: (userId: string, checkinId: string) => Promise<void>
  uploadPhoto: (userId: string, foodId: string, file: File) => Promise<string>
}

const BUCKET = 'food-photos'

export function createSupabaseProgressAdapter(client: SupabaseClient): ProgressAdapter {
  async function load(userId: string): Promise<CloudProgress> {
    const { data, error } = await client
      .from('user_foods')
      .select('food_id, photo_path')
      .eq('user_id', userId)

    if (error) throw error

    const photos: Record<string, string> = {}
    const { data: checkinData, error: checkinError } = await client.from('user_food_checkins').select('id, food_id, eaten_at, rating, location').eq('user_id', userId)
    if (checkinError) throw checkinError
    await Promise.all(
      data
        .filter((row) => row.photo_path)
        .map(async (row) => {
          const { data: signedUrl, error: signedUrlError } = await client.storage
            .from(BUCKET)
            .createSignedUrl(row.photo_path, 3600)
          if (signedUrlError) throw signedUrlError
          photos[row.food_id] = signedUrl.signedUrl
        })
    )

    return {
      checkins: checkinData.map((row) => ({ id: row.id, foodId: row.food_id, eatenAt: row.eaten_at, rating: row.rating, location: row.location ?? '' })),
      photos
    }
  }

  async function addCheckin(userId: string, foodId: string, rating: number, location: string) {
    const { data, error } = await client.from('user_food_checkins').insert({ user_id: userId, food_id: foodId, rating, location: location || null }).select('id, food_id, eaten_at, rating, location').single()
    if (error) throw error
    return { id: data.id, foodId: data.food_id, eatenAt: data.eaten_at, rating: data.rating, location: data.location ?? '' }
  }

  async function updateCheckin(userId: string, checkin: Checkin) {
    const { error } = await client.from('user_food_checkins').update({ rating: checkin.rating, location: checkin.location || null }).eq('id', checkin.id).eq('user_id', userId)
    if (error) throw error
  }

  async function deleteCheckin(userId: string, checkinId: string) {
    const { error } = await client.from('user_food_checkins').delete().eq('id', checkinId).eq('user_id', userId)
    if (error) throw error
  }

  async function uploadPhoto(userId: string, foodId: string, file: File) {
    const path = `${userId}/${foodId}`
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { error: progressError } = await client
      .from('user_foods')
      .upsert({ user_id: userId, food_id: foodId, photo_path: path })
    if (progressError) throw progressError

    const { data, error: signedUrlError } = await client.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (signedUrlError) throw signedUrlError
    return data.signedUrl
  }

  return { load, addCheckin, updateCheckin, deleteCheckin, uploadPhoto }
}
