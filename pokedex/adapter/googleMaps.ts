import type { FoodLocation } from '~/domain/progress'
import {
  locationFromPlace,
  nearbyRestaurantSearchRequest,
  type GooglePlace,
  type LatLngLiteral
} from '~/utils/googlePlaces'

export type GoogleMap = {
  addListener: (event: string, callback: (event: { latLng: { lat: () => number; lng: () => number } }) => void) => void
}

export type GoogleMaps = {
  importLibrary: (library: string) => Promise<unknown>
}

export type MapsLibrary = {
  Map: new (element: HTMLElement, options: {
    center: LatLngLiteral
    zoom: number
    mapId: string
    mapTypeControl: boolean
    streetViewControl: boolean
  }) => GoogleMap
}

export type MarkerLibrary = {
  AdvancedMarkerElement: new (options: {
    map: GoogleMap
    position: LatLngLiteral
    content?: HTMLElement
  }) => { map: GoogleMap | null }
}

type PlacesLibrary = {
  Place: {
    searchNearby: (request: {
      fields: string[]
      includedTypes?: string[]
      locationRestriction: { center: LatLngLiteral; radius: number }
      maxResultCount: number
      rankPreference?: 'DISTANCE' | 'POPULARITY'
    }) => Promise<{ places: GooglePlace[] }>
  }
}

type GoogleWindow = Window & { google?: { maps: GoogleMaps } }

export function createGoogleMapsService(apiKey: string) {
  let mapsPromise: Promise<GoogleMaps> | null = null

  function loadMaps(): Promise<GoogleMaps> {
    if (mapsPromise) return mapsPromise
    mapsPromise = new Promise((resolve, reject) => {
      const finish = () => {
        const maps = (window as GoogleWindow).google?.maps
        if (maps?.importLibrary) resolve(maps)
        else reject(new Error('Google Maps loaded without its API.'))
      }
      if ((window as GoogleWindow).google?.maps) {
        finish()
        return
      }
      if (!apiKey) {
        reject(new Error('Google Maps is not configured.'))
        return
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps]')
      if (existing) {
        existing.addEventListener('load', finish, { once: true })
        existing.addEventListener('error', () => reject(new Error('Unable to load Google Maps.')), { once: true })
        return
      }
      const script = document.createElement('script')
      script.dataset.googleMaps = 'true'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`
      script.async = true
      script.defer = true
      script.addEventListener('load', finish, { once: true })
      script.addEventListener('error', () => reject(new Error('Unable to load Google Maps.')), { once: true })
      document.head.appendChild(script)
    })
    return mapsPromise
  }

  async function searchNearbyRestaurants(center: LatLngLiteral) {
    const maps = await loadMaps()
    const places = await maps.importLibrary('places') as PlacesLibrary
    const result = await places.Place.searchNearby(nearbyRestaurantSearchRequest(center))
    return result.places
  }

  async function findPlaceAt(point: LatLngLiteral): Promise<FoodLocation | null> {
    const maps = await loadMaps()
    const places = await maps.importLibrary('places') as PlacesLibrary
    const result = await places.Place.searchNearby({
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'],
      locationRestriction: { center: point, radius: 50 },
      maxResultCount: 1
    })
    const place = result.places[0]
    return place ? locationFromPlace(place) : null
  }

  return { loadMaps, searchNearbyRestaurants, findPlaceAt }
}

export function currentLocation(
  fallback: LatLngLiteral,
  geolocation: Geolocation | null = typeof navigator === 'undefined' ? null : navigator.geolocation
) {
  if (!geolocation) {
    console.warn('Unable to access browser geolocation; using the default map location.', fallback)
    return Promise.resolve(fallback)
  }

  return new Promise<LatLngLiteral>((resolve) => {
    geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => {
        console.warn('Unable to determine browser location; using the default map location.', error)
        resolve(fallback)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )
  })
}
