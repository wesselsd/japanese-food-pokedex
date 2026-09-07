import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createSupabaseProgressAdapter } from '../adapter/supabase/progress'

type FakeQuery = {
  data: unknown
  error: unknown
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
}

function createQuery(data: unknown, singleData = data): FakeQuery {
  const query = {} as FakeQuery
  query.data = data
  query.error = null
  query.select = vi.fn(() => query)
  query.insert = vi.fn(() => query)
  query.update = vi.fn(() => query)
  query.delete = vi.fn(() => query)
  query.upsert = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.single = vi.fn().mockResolvedValue({ data: singleData, error: null })
  return query
}

function createClient(queries: Record<string, FakeQuery>) {
  const storage = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/photo.jpg' }, error: null }),
    remove: vi.fn().mockResolvedValue({ error: null })
  }
  const client = {
    from: vi.fn((table: string) => queries[table]),
    storage: { from: vi.fn(() => storage) }
  }

  return {
    client: client as unknown as SupabaseClient,
    storage
  }
}

describe('Supabase progress adapter', () => {
  it('loads and maps check-ins and photos from user-scoped rows', async () => {
    const checkins = createQuery([{
      id: 'checkin-1',
      food_id: 'sushi',
      eaten_at: '2026-09-07T00:00:00Z',
      rating: 4,
      location: 'Sushi Bar',
      location_details: {
        placeId: 'place-1',
        name: 'Sushi Bar',
        address: 'Tokyo',
        latitude: 35.6,
        longitude: 139.6,
        mapsUrl: 'https://maps.example/place-1'
      }
    }])
    const photos = createQuery([{
      id: 'photo-1',
      food_id: 'sushi',
      photo_path: 'user-1/sushi/photo-1.jpg',
      is_selected: true
    }, {
      id: 'photo-2',
      food_id: 'sushi',
      photo_path: 'user-1/sushi/photo-2.jpg',
      is_selected: false
    }])
    const { client, storage } = createClient({
      user_food_checkins: checkins,
      user_food_photos: photos
    })
    const adapter = createSupabaseProgressAdapter(client)

    const state = await adapter.load('user-1')

    expect(state.checkins[0]).toMatchObject({
      id: 'checkin-1',
      foodId: 'sushi',
      rating: 4,
      location: 'Sushi Bar'
    })
    expect(state.photos.sushi).toEqual([
      { id: 'photo-1', url: 'https://signed.example/photo.jpg' },
      { id: 'photo-2', url: 'https://signed.example/photo.jpg' }
    ])
    expect(state.selectedPhotos).toEqual({ sushi: 'photo-1' })
    expect(checkins.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(photos.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(storage.createSignedUrl).toHaveBeenCalledWith('user-1/sushi/photo-1.jpg', 3600)
  })

  it('scopes check-in mutations to the current user', async () => {
    const checkins = createQuery(null, {
      id: 'checkin-2',
      food_id: 'ramen',
      eaten_at: '2026-09-07T00:00:00Z',
      rating: 5,
      location: null,
      location_details: null
    })
    const { client } = createClient({
      user_food_checkins: checkins
    })
    const adapter = createSupabaseProgressAdapter(client)

    await adapter.addCheckin('user-2', 'ramen', 5, '')
    await adapter.updateCheckin('user-2', {
      id: 'checkin-2',
      foodId: 'ramen',
      eatenAt: '2026-09-07T00:00:00Z',
      rating: 3,
      location: ''
    })
    await adapter.deleteCheckin('user-2', 'checkin-2')

    expect(checkins.insert).toHaveBeenCalledWith({
      user_id: 'user-2',
      food_id: 'ramen',
      rating: 5,
      location: null,
      location_details: null
    })
    expect(checkins.update).toHaveBeenCalledWith({
      rating: 3,
      location: null,
      location_details: null
    })
    expect(checkins.delete).toHaveBeenCalled()
    expect(checkins.eq).toHaveBeenCalledWith('user_id', 'user-2')
  })

  it('uploads, selects, and deletes a new photo', async () => {
    const photos = createQuery(null, {
      id: 'photo-2',
      food_id: 'sushi',
      photo_path: 'user-3/sushi/photo-2.jpg'
    })
    const { client, storage } = createClient({
      user_food_photos: photos
    })
    const adapter = createSupabaseProgressAdapter(client)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    const uploaded = await adapter.uploadPhoto('user-3', 'sushi', file)
    await adapter.selectPhoto('user-3', 'sushi', uploaded.id)
    await adapter.deletePhoto('user-3', 'sushi', uploaded.id)

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-3\/sushi\/.+\.jpg$/),
      file,
      { upsert: true }
    )
    expect(photos.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-3',
      food_id: 'sushi',
      is_selected: true
    }))
    expect(photos.update).toHaveBeenCalledWith({ is_selected: false })
    expect(photos.update).toHaveBeenCalledWith({ is_selected: true })
    expect(storage.remove).toHaveBeenCalled()
    expect(photos.delete).toHaveBeenCalled()
  })

  it('propagates storage failures', async () => {
    const photos = createQuery(null)
    const { client, storage } = createClient({ user_food_photos: photos })
    storage.upload.mockResolvedValueOnce({ error: new Error('Storage unavailable') })
    const adapter = createSupabaseProgressAdapter(client)

    await expect(adapter.uploadPhoto(
      'user-4',
      'sushi',
      new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    )).rejects.toThrow('Storage unavailable')
  })
})
