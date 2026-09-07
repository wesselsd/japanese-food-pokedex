import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGoogleMapsService, currentLocation } from '../adapter/googleMaps'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.querySelectorAll('script[data-google-maps]').forEach((script) => script.remove())
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

  it('loads the Maps script and resolves once the API is available', async () => {
    let script: HTMLScriptElement | undefined
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      script = node as HTMLScriptElement
      return node
    })
    const service = createGoogleMapsService('test-key')
    const loading = service.loadMaps()

    expect(script?.src).toContain('key=test-key')
    const maps = { importLibrary: vi.fn() }
    vi.stubGlobal('google', { maps })
    script?.dispatchEvent(new Event('load'))

    await expect(loading).resolves.toBe(maps)
  })

  it('reports script-loading failures', async () => {
    let script: HTMLScriptElement | undefined
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      script = node as HTMLScriptElement
      return node
    })
    const loading = createGoogleMapsService('test-key').loadMaps()

    script?.dispatchEvent(new Event('error'))

    await expect(loading).rejects.toThrow('Unable to load Google Maps.')
  })

  it('reuses an existing Maps script', async () => {
    const existing = document.createElement('script')
    existing.dataset.googleMaps = 'true'
    document.head.appendChild(existing)
    const maps = { importLibrary: vi.fn() }
    vi.stubGlobal('google', { maps })

    const loading = createGoogleMapsService('test-key').loadMaps()
    existing.dispatchEvent(new Event('load'))

    await expect(loading).resolves.toBe(maps)
    expect(document.querySelectorAll('script[data-google-maps]')).toHaveLength(1)
  })

  it('rejects when an existing Maps script fails', async () => {
    const existing = document.createElement('script')
    existing.dataset.googleMaps = 'true'
    document.head.appendChild(existing)

    const loading = createGoogleMapsService('test-key').loadMaps()
    existing.dispatchEvent(new Event('error'))

    await expect(loading).rejects.toThrow('Unable to load Google Maps.')
  })

  it('rejects when the loaded global does not expose the Maps API', async () => {
    let script: HTMLScriptElement | undefined
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      script = node as HTMLScriptElement
      return node
    })
    const loading = createGoogleMapsService('test-key').loadMaps()

    vi.stubGlobal('google', { maps: {} })
    script?.dispatchEvent(new Event('load'))

    await expect(loading).rejects.toThrow('Google Maps loaded without its API.')
  })

  it('uses the browser location and falls back when it is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
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
    expect(warn).toHaveBeenCalledWith(
      'Unable to determine browser location; using the default map location.',
      expect.anything()
    )
  })

  it('logs and uses the fallback when geolocation is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(currentLocation({ lat: 35, lng: 139 }, null)).resolves.toEqual({ lat: 35, lng: 139 })
    expect(warn).toHaveBeenCalledWith(
      'Unable to access browser geolocation; using the default map location.',
      { lat: 35, lng: 139 }
    )
  })
})
