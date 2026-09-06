<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import type { FoodLocation } from '~/adapter/supabase/progress'
import {
  locationFromPlace,
  nearbyRestaurantSearchRequest,
  placeName,
  type GooglePlace,
  type LatLngLiteral,
} from '~/utils/googlePlaces'
type GoogleMap = {
  addListener: (event: string, callback: (event: { latLng: { lat: () => number; lng: () => number } }) => void) => void
}
type GoogleMaps = {
  importLibrary: (library: string) => Promise<unknown>
}
type GoogleWindow = Window & { google?: { maps: GoogleMaps } }
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
type MapsLibrary = {
  Map: new (element: HTMLElement, options: { center: LatLngLiteral; zoom: number; mapId: string; mapTypeControl: boolean; streetViewControl: boolean }) => GoogleMap
}
type MarkerLibrary = {
  AdvancedMarkerElement: new (options: { map: GoogleMap; position: LatLngLiteral; content?: HTMLElement }) => { map: GoogleMap | null }
}

const emit = defineEmits<{
  selected: [location: FoodLocation]
  error: [message: string]
}>()

const config = useRuntimeConfig()
const mapHost = ref<HTMLElement | null>(null)
const mode = ref<'map' | 'nearby'>('map')
const nearbyRestaurants = shallowRef<GooglePlace[]>([])
const nearbyLoading = ref(false)
const currentCenter = ref<LatLngLiteral>({ lat: 35.6762, lng: 139.6503 })
let marker: { map: GoogleMap | null } | null = null
let currentLocationMarker: { map: GoogleMap | null } | null = null
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
    if (!config.public.googleMapsApiKey) {
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.public.googleMapsApiKey)}&v=weekly`
    script.async = true
    script.defer = true
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', () => reject(new Error('Unable to load Google Maps.')), { once: true })
    document.head.appendChild(script)
  })
  return mapsPromise
}

async function selectLocation(map: GoogleMap, places: PlacesLibrary, point: LatLngLiteral) {
  try {
    if (marker) marker.map = null
    const maps = await loadMaps()
    const markerLibrary = await maps.importLibrary('marker') as MarkerLibrary
    const selectedMarker = document.createElement('div')
    selectedMarker.className = 'selected-location-marker'
    marker = new markerLibrary.AdvancedMarkerElement({ map, position: point, content: selectedMarker })
    const result = await places.Place.searchNearby({
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'],
      locationRestriction: { center: point, radius: 50 },
      maxResultCount: 1
    })
    const place = result.places[0]
    const location = place && locationFromPlace(place)
    if (!location) {
      emit('error', 'Google Maps could not find a named place at that point. Try clicking closer to the location.')
      return
    }
    emit('selected', location)
  } catch (cause) {
    emit('error', cause instanceof Error ? cause.message : 'Unable to select this location.')
  }
}

async function loadNearbyRestaurants() {
  nearbyLoading.value = true
  try {
    const maps = await loadMaps()
    const places = await maps.importLibrary('places') as PlacesLibrary
    const result = await places.Place.searchNearby(nearbyRestaurantSearchRequest(currentCenter.value))
    nearbyRestaurants.value = result.places
  } catch (cause) {
    emit('error', cause instanceof Error ? cause.message : 'Unable to load nearby restaurants.')
  } finally {
    nearbyLoading.value = false
  }
}

function chooseNearby(place: GooglePlace) {
  const location = locationFromPlace(place)
  if (location) emit('selected', location)
  else emit('error', 'Google did not return a complete restaurant location.')
}

async function setupMap() {
  try {
    const maps = await loadMaps()
    const mapsLibrary = await maps.importLibrary('maps') as MapsLibrary
    const placesLibrary = await maps.importLibrary('places') as PlacesLibrary
    if (!mapHost.value) return
    let center = { lat: 35.6762, lng: 139.6503 }
    let hasCurrentLocation = false
    if (navigator.geolocation) {
      center = await new Promise<LatLngLiteral>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            hasCurrentLocation = true
            resolve({ lat: position.coords.latitude, lng: position.coords.longitude })
          },
          () => resolve(center),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        )
      })
    }
    const map = new mapsLibrary.Map(mapHost.value, {
      center,
      zoom: hasCurrentLocation ? 15 : 12,
      mapId: config.public.googleMapsMapId,
      mapTypeControl: false,
      streetViewControl: false
    })
    currentCenter.value = center
    if (hasCurrentLocation) {
      const markerLibrary = await maps.importLibrary('marker') as MarkerLibrary
      const currentMarker = document.createElement('div')
      currentMarker.className = 'current-location-marker'
      currentLocationMarker = new markerLibrary.AdvancedMarkerElement({
        map,
        position: center,
        content: currentMarker
      })
    }
    map.addListener('click', (event) => {
      void selectLocation(map, placesLibrary, { lat: event.latLng.lat(), lng: event.latLng.lng() })
    })
  } catch (cause) {
    emit('error', cause instanceof Error ? cause.message : 'Unable to load Google Maps.')
  }
}

onMounted(setupMap)
</script>

<template>
  <div class="location-picker-tabs" role="tablist" aria-label="Location selection method">
    <button type="button" class="location-tab" :class="{ active: mode === 'map' }" @click="mode = 'map'">Select on map</button>
    <button type="button" class="location-tab" :class="{ active: mode === 'nearby' }" @click="mode = 'nearby'; loadNearbyRestaurants()">Nearby restaurants</button>
  </div>
  <div v-show="mode === 'map'" ref="mapHost" class="location-picker-map" aria-label="Choose a location on the map" />
  <div v-show="mode === 'nearby'" class="nearby-restaurants">
    <p v-if="nearbyLoading" class="location-status">Loading nearby restaurants...</p>
    <p v-else-if="!nearbyRestaurants.length" class="location-status">No restaurants found nearby.</p>
    <template v-else>
      <button v-for="restaurant in nearbyRestaurants" :key="restaurant.id" type="button" class="nearby-restaurant" @click="chooseNearby(restaurant)">
        <strong>{{ placeName(restaurant) }}</strong>
        <span>{{ restaurant.formattedAddress }}</span>
      </button>
    </template>
  </div>
</template>
