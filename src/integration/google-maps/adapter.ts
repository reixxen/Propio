import { Location, LocationSchema } from '@/models/location'
import { GoogleMapsClient } from './client'
import {
  GeocodeAddressComponent,
  GeocodeLocationType,
  GeocodeResult,
} from './models'

const ACCEPTED_LOCATION_TYPES = new Set<GeocodeLocationType>([
  'ROOFTOP',
  'RANGE_INTERPOLATED',
])

const ACCEPTED_RESULT_TYPES = new Set<GeocodeResult['types'][number]>([
  'street_address',
  'premise',
  'subpremise',
])

export class GoogleMapsAdapter {
  constructor(private readonly client: GoogleMapsClient) {}

  async resolveByAddress(
    address: string,
    city: string
  ): Promise<Location | null> {
    const response = await this.client.geocode(address, city)

    if (response.status === 'ZERO_RESULTS') {
      console.log(`Resolve by address: ${address} ${city} - ZERO_RESULTS`)
      return null
    }

    if (response.status !== 'OK') {
      throw new Error(`Geocoding failed with status: ${response.status}`)
    }

    const result = response.results.find((r) => {
      if (r.partial_match) return false
      if (!ACCEPTED_LOCATION_TYPES.has(r.geometry.location_type)) return false
      if (!r.types.some((t) => ACCEPTED_RESULT_TYPES.has(t))) return false
      return true
    })

    if (!result) {
      console.log(`Resolve by address: ${address} ${city} - NO_RESULT`)
      return null
    }

    const mappedLocation = this.mapResultToLocation(result)

    const parsed = LocationSchema.safeParse(mappedLocation)
    if (!parsed.success) {
      console.log(
        `Resolve by address: ${address} ${city} - INVALID_RESULT, ${JSON.stringify(parsed.error, null, 2)}`
      )
      return null
    }

    return parsed.data
  }

  async resolveByCoords(lat: number, lng: number): Promise<Location | null> {
    const response = await this.client.reverseGeocode(lat, lng)

    if (response.status === 'ZERO_RESULTS') {
      console.log(`Resolve by coords: ${lat} ${lng} - ZERO_RESULTS`)
      return null
    }

    if (response.status !== 'OK') {
      throw new Error(`Geocoding failed with status: ${response.status}`)
    }

    const result = response.results.find((r) => {
      if (r.partial_match) return false
      if (!ACCEPTED_LOCATION_TYPES.has(r.geometry.location_type)) return false
      if (!r.types.some((t) => ACCEPTED_RESULT_TYPES.has(t))) return false
      return true
    })

    if (!result) {
      console.log(`Resolve by coords: ${lat} ${lng} - NO_RESULT`)
      return null
    }

    const mappedLocation = this.mapResultToLocation(result)

    const parsed = LocationSchema.safeParse(mappedLocation)

    if (!parsed.success) {
      console.log(
        `Resolve by coords: ${lat} ${lng} - INVALID_RESULT, ${JSON.stringify(parsed.error, null, 2)}`
      )
      return null
    }

    return parsed.data
  }

  private mapResultToLocation(result: GeocodeResult): Location {
    const findComponent = (type: GeocodeAddressComponent['types'][number]) =>
      result.address_components.find((c) => c.types.includes(type))

    const streetNumber = findComponent('street_number')

    const route = findComponent('route')

    const city =
      findComponent('locality') ||
      findComponent('administrative_area_level_2') ||
      findComponent('administrative_area_level_1')

    const street = [route?.long_name, streetNumber?.long_name]
      .filter(Boolean)
      .join(', ')

    return {
      fullAddress: result.formatted_address,
      city: city?.long_name || '',
      address: street,
      lat: result.geometry.location.lat,
      lon: result.geometry.location.lng,
    }
  }
}
