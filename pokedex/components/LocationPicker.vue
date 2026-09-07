<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import {
  createGoogleMapsService,
  currentLocation,
  type GoogleMap,
  type MapsLibrary,
  type MarkerLibrary
} from '~/adapter/googleMaps'
import {
  placeName,
  type GooglePlace,
  type LatLngLiteral
} from '~/utils/googlePlaces'

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
const mapsService = createGoogleMapsService(config.public.googleMapsApiKey)
let marker: { map: GoogleMap | null } | null = null
let currentLocationMarker: { map: GoogleMap | null } | null = null

async function selectLocation(map: GoogleMap, point: LatLngLiteral) {
  try {
    if (marker) marker.map = null
    const maps = await mapsService.loadMaps()
    const markerLibrary = await maps.importLibrary('marker') as MarkerLibrary
    const selectedMarker = document.createElement('div')
    selectedMarker.className = 'selected-location-marker'
    marker = new markerLibrary.AdvancedMarkerElement({ map, position: point, content: selectedMarker })
    const location = await mapsService.findPlaceAt(point)
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
    nearbyRestaurants.value = await mapsService.searchNearbyRestaurants(currentCenter.value)
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
    const maps = await mapsService.loadMaps()
    const mapsLibrary = await maps.importLibrary('maps') as MapsLibrary
    if (!mapHost.value) return
    let center = { lat: 35.6762, lng: 139.6503 }
    const initialCenter = await currentLocation(center)
    const hasCurrentLocation = initialCenter !== center
    center = initialCenter
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
      void selectLocation(map, { lat: event.latLng.lat(), lng: event.latLng.lng() })
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
