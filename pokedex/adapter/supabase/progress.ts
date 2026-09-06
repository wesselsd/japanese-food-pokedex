import type { SupabaseClient } from '@supabase/supabase-js'

export type CloudProgress = {
  eatenFoods: string[]
  eatenDates: Record<string, string>
  photos: Record<string, string>
}

export type ProgressAdapter = {
  load: (userId: string) => Promise<CloudProgress>
  setEaten: (userId: string, foodId: string, eaten: boolean) => Promise<void>
  uploadPhoto: (userId: string, foodId: string, file: File) => Promise<string>
}

const BUCKET = 'food-photos'

export function createSupabaseProgressAdapter(client: SupabaseClient): ProgressAdapter {
  async function load(userId: string): Promise<CloudProgress> {
    const { data, error } = await client
      .from('user_foods')
      .select('food_id, photo_path, eaten_at')
      .eq('user_id', userId)

    if (error) throw error

    const photos: Record<string, string> = {}
    const eatenDates: Record<string, string> = {}
    data.forEach((row) => { eatenDates[row.food_id] = row.eaten_at })
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
      eatenFoods: data.map((row) => row.food_id),
      eatenDates,
      photos
    }
  }

  async function setEaten(userId: string, foodId: string, eaten: boolean) {
    if (eaten) {
      const { error } = await client.from('user_foods').upsert({ user_id: userId, food_id: foodId })
      if (error) throw error
      return
    }

    const { error } = await client.from('user_foods').delete().eq('user_id', userId).eq('food_id', foodId)
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

  return { load, setEaten, uploadPhoto }
}
