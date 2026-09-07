import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import nearbyRestaurantsResponse from './fixtures/realresponse.json'
import LocationPicker from '../components/LocationPicker.vue'
import {
  locationFromPlace,
  nearbyRestaurantSearchRequest,
  placeName
} from '../utils/googlePlaces'

describe('Google Places business logic', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds a nearest-first restaurant search request', () => {
    expect(nearbyRestaurantSearchRequest({ lat: 35.6595, lng: 139.7005 })).toEqual({
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'],
      includedTypes: ['restaurant'],
      locationRestriction: {
        center: { lat: 35.6595, lng: 139.7005 },
        radius: 1500
      },
      maxResultCount: 20,
      rankPreference: 'DISTANCE'
    })
  })

  it('converts the Nearby Search response into selectable locations', () => {
    const locations = nearbyRestaurantsResponse.places.map(locationFromPlace)

    expect(locations[0]).toEqual({
      placeId: 'ChIJu4fJrkQLkEcRoOWwRmXn_tY',
      name: 'Al Ventotto',
      address: 'Schaffhauserstrasse 29, 8006 Zürich, Switzerland',
      latitude: 47.3902897,
      longitude: 8.538744399999999,
      mapsUrl: nearbyRestaurantsResponse.places[0].googleMapsURI
    })
    expect(locations).toHaveLength(19)
    expect(placeName(nearbyRestaurantsResponse.places[0])).toBe('Al Ventotto')
  })

  it('does not use the address as a fallback restaurant name', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const place = {
      id: 'missing-name',
      formattedAddress: 'Somewhere in Zürich'
    }

    expect(placeName(place)).toBe('Unknown restaurant')
    expect(error).toHaveBeenCalledWith(
      'Google Places response parsing error: expected a non-empty displayName.',
      place
    )

    error.mockRestore()
  })

  it('shows the restaurant name and address in the nearby restaurant list', async () => {
    const searchNearby = async () => nearbyRestaurantsResponse
    const maps = {
      importLibrary: async (library: string) => {
        if (library === 'maps') {
          return { Map: class {
            addListener() {}
          } }
        }
        if (library === 'places') {
          return { Place: { searchNearby } }
        }
        return { AdvancedMarkerElement: class {} }
      }
    }
    vi.stubGlobal('google', { maps })
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        googleMapsApiKey: 'test-key',
        googleMapsMapId: 'test-map-id'
      }
    }))

    const wrapper = mount(LocationPicker)
    await wrapper.find('button.location-tab:not(.active)').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.nearby-restaurant').exists()).toBe(true))

    const firstRestaurant = wrapper.find('.nearby-restaurant')
    expect(firstRestaurant.text()).toContain('Al Ventotto')
    expect(firstRestaurant.text()).toContain('Schaffhauserstrasse 29, 8006 Zürich, Switzerland')
  })

  it('emits a useful error when the map cannot be initialized', async () => {
    vi.stubGlobal('google', {
      maps: {
        importLibrary: vi.fn().mockRejectedValue(new Error('Maps service unavailable'))
      }
    })
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        googleMapsApiKey: 'test-key',
        googleMapsMapId: 'test-map-id'
      }
    }))

    const wrapper = mount(LocationPicker)
    await vi.waitFor(() => expect(wrapper.emitted('error')).toEqual([['Maps service unavailable']]))
  })

  it('clears the previous marker when selecting another map point', async () => {
    let clickHandler: ((event: { latLng: { lat: () => number; lng: () => number } }) => void) | undefined
    const markers: Array<{ map: unknown }> = []
    const searchNearby = vi.fn().mockResolvedValue({
      places: [{
        id: 'place-3',
        displayName: 'Ramen Shop',
        formattedAddress: 'Osaka',
        location: { lat: 34.7, lng: 135.5 },
        googleMapsURI: 'https://maps.example/place-3'
      }]
    })
    class FakeMap {
      addListener(_event: string, callback: typeof clickHandler) {
        clickHandler = callback ?? undefined
      }
    }
    class FakeMarker {
      map: unknown

      constructor(options: { map: unknown }) {
        this.map = options.map
        markers.push(this)
      }
    }
    const maps = {
      importLibrary: async (library: string) => {
        if (library === 'maps') return { Map: FakeMap }
        if (library === 'marker') return { AdvancedMarkerElement: FakeMarker }
        return { Place: { searchNearby } }
      }
    }
    vi.stubGlobal('google', { maps })
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        googleMapsApiKey: 'test-key',
        googleMapsMapId: 'test-map-id'
      }
    }))

    const wrapper = mount(LocationPicker)
    await vi.waitFor(() => expect(clickHandler).toBeTypeOf('function'))
    clickHandler?.({ latLng: { lat: () => 34.7, lng: () => 135.5 } })
    await vi.waitFor(() => expect(wrapper.emitted('selected')).toHaveLength(1))
    const firstMarker = markers[0]

    clickHandler?.({ latLng: { lat: () => 34.8, lng: () => 135.6 } })
    await vi.waitFor(() => expect(markers).toHaveLength(2))

    expect(firstMarker.map).toBeNull()
    expect(markers[1].map).not.toBeNull()
  })

})
