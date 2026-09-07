import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGoogleMapsService, currentLocation } from '../adapter/googleMaps'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Google Maps service', () => {
  it('loads Places through the Maps API and searches nearby restaurants', async () => {
    const searchNearby = vi.fn().mockResolvedValue({
      places: [{
        id: 'place-1',
        displayName: 'Sushi Bar',
        formattedAddress: 'Tokyo',
        location: { lat: 35.6, lng: 139.6 }
      }]
    })
    const importLibrary = vi.fn().mockImplementation(async (library: string) => library === 'places'
      ? { Place: { searchNearby } }
      : {})
    vi.stubGlobal('google', { maps: { importLibrary } })

    const service = createGoogleMapsService('test-key')
    const restaurants = await service.searchNearbyRestaurants({ lat: 35.6, lng: 139.6 })

    expect(restaurants).toHaveLength(1)
    expect(searchNearby).toHaveBeenCalledWith(expect.objectContaining({
      includedTypes: ['restaurant'],
      maxResultCount: 20
    }))
  })

  it('converts a map point into a named location', async () => {
    const importLibrary = vi.fn().mockResolvedValue({
      Place: {
        searchNearby: vi.fn().mockResolvedValue({
          places: [{
            id: 'place-2',
            displayName: 'Ramen Shop',
            formattedAddress: 'Osaka',
            location: { lat: 34.7, lng: 135.5 },
            googleMapsURI: 'https://maps.example/place-2'
          }]
        })
      }
    })
    vi.stubGlobal('google', { maps: { importLibrary } })

    const location = await createGoogleMapsService('test-key').findPlaceAt({ lat: 34.7, lng: 135.5 })

    expect(location).toEqual({
      placeId: 'place-2',
      name: 'Ramen Shop',
      address: 'Osaka',
      latitude: 34.7,
      longitude: 135.5,
      mapsUrl: 'https://maps.example/place-2'
    })
  })

  it('fails clearly when Maps is not configured', async () => {
    await expect(createGoogleMapsService('').loadMaps()).rejects.toThrow('Google Maps is not configured.')
  })

  it('uses the browser location and falls back when it is unavailable', async () => {
    const located = await currentLocation(
      { lat: 35, lng: 139 },
      {
        getCurrentPosition: (success) => success({
          coords: { latitude: 34.7, longitude: 135.5 }
        } as GeolocationPosition)
      } as Geolocation
    )
    const fallback = await currentLocation(
      { lat: 35, lng: 139 },
      {
        getCurrentPosition: (_success, error) => error?.({} as GeolocationPositionError)
      } as Geolocation
    )

    expect(located).toEqual({ lat: 34.7, lng: 135.5 })
    expect(fallback).toEqual({ lat: 35, lng: 139 })
  })
})
