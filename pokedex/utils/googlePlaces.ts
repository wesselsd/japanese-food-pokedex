import type { FoodLocation } from '~/adapter/supabase/progress'

export type LatLngLiteral = { lat: number; lng: number }

type PlaceLocation = {
  latitude?: number
  longitude?: number
  lat?: number | (() => number)
  lng?: number | (() => number)
}

export type GooglePlace = {
  id?: string
  displayName?: string | { text?: string }
  formattedAddress?: string
  location?: PlaceLocation
  googleMapsURI?: string
  googleMapsUri?: string
}

export function placeName(place: GooglePlace) {
  const name = typeof place.displayName === 'string'
    ? place.displayName
    : place.displayName?.text

  if (name) return name

  console.error(
    'Google Places response parsing error: expected a non-empty displayName.',
    place
  )
  return 'Unknown restaurant'
}

function placeCoordinates(place: GooglePlace): LatLngLiteral | null {
  if (!place.location) {
    console.error(
      'Google Places response parsing error: expected a location with latitude and longitude.',
      place
    )
    return null
  }

  const latitude = typeof place.location.lat === 'function'
    ? place.location.lat()
    : place.location.lat ?? place.location.latitude
  const longitude = typeof place.location.lng === 'function'
    ? place.location.lng()
    : place.location.lng ?? place.location.longitude

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    console.error(
      'Google Places response parsing error: expected numeric location latitude and longitude.',
      place
    )
    return null
  }

  return { lat: latitude, lng: longitude }
}

export function locationFromPlace(place: GooglePlace): FoodLocation | null {
  const coordinates = placeCoordinates(place)
  if (!place.id) {
    console.error(
      'Google Places response parsing error: expected a place id.',
      place
    )
    return null
  }
  if (!coordinates) return null

  return {
    placeId: place.id,
    name: placeName(place),
    address: place.formattedAddress || '',
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    mapsUrl: place.googleMapsURI || place.googleMapsUri ||
      `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
  }
}

export function nearbyRestaurantSearchRequest(center: LatLngLiteral) {
  return {
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'],
    includedTypes: ['restaurant'],
    locationRestriction: { center, radius: 1500 },
    maxResultCount: 20,
    rankPreference: 'DISTANCE' as const
  }
}
