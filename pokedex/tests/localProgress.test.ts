import { afterEach, describe, expect, it } from 'vitest'
import { createLocalProgressStore } from '../adapter/localProgress'

afterEach(() => {
  localStorage.clear()
})

describe('local progress store', () => {
  it('loads legacy eaten and photo data and persists check-in changes', async () => {
    localStorage.setItem('pokedex-eaten', JSON.stringify(['sushi']))
    localStorage.setItem('pokedex-photos', JSON.stringify({ sushi: 'data:image/jpeg;base64,photo' }))
    localStorage.setItem('pokedex-selected-photos', JSON.stringify({ sushi: 'legacy' }))

    const store = createLocalProgressStore()
    const initial = await store.load()

    expect(initial.checkins).toMatchObject([{ foodId: 'sushi', rating: 5 }])
    expect(initial.photos).toEqual({ sushi: [{ id: 'legacy', url: 'data:image/jpeg;base64,photo' }] })
    expect(initial.selectedPhotos).toEqual({ sushi: 'legacy' })

    const checkin = await store.addCheckin('ramen', 4, 'Tokyo')
    expect((await store.load()).checkins).toContainEqual(checkin)

    await store.updateCheckin({ ...checkin, rating: 3, location: 'Kyoto' })
    expect((await store.load()).checkins).toContainEqual({ ...checkin, rating: 3, location: 'Kyoto' })

    await store.deleteCheckin(checkin.id)
    expect((await store.load()).checkins.some((item) => item.id === checkin.id)).toBe(false)
  })

  it('stores, selects, and removes uploaded photos', async () => {
    const store = createLocalProgressStore()
    const photo = await store.uploadPhoto('sushi', new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }))

    expect(photo.url).toMatch(/^data:image\/jpeg/)
    expect((await store.load()).selectedPhotos.sushi).toBe(photo.id)

    await store.selectPhoto('sushi', 'default')
    expect((await store.load()).selectedPhotos.sushi).toBe('default')

    await store.deletePhoto('sushi', photo.id)
    expect((await store.load()).photos.sushi).toEqual([])
    expect((await store.load()).selectedPhotos.sushi).toBe('default')
  })

  it('surfaces malformed saved progress', async () => {
    localStorage.setItem('pokedex-checkins', '{invalid')

    await expect(createLocalProgressStore().load()).rejects.toThrow('Unable to read saved progress from pokedex-checkins.')
  })
})
