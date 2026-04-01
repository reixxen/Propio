import { z } from 'zod'

const AddressType = z.enum([
  'street_address',
  'route',
  'intersection',
  'political',
  'country',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'administrative_area_level_5',
  'administrative_area_level_6',
  'administrative_area_level_7',
  'colloquial_area',
  'locality',
  'sublocality',
  'neighborhood',
  'premise',
  'subpremise',
  'plus_code',
  'postal_code',
  'natural_feature',
  'airport',
  'park',
  'point_of_interest',
])

const AddressComponentType = z.enum([
  'floor',
  'establishment',
  'landmark',
  'point_of_interest',
  'parking',
  'post_box',
  'postal_town',
  'room',
  'street_number',
  'bus_station',
  'train_station',
  'transit_station',
])

const LocationType = z.enum([
  'ROOFTOP', // — точный адрес дома ✅
  'RANGE_INTERPOLATED', // — приблизительный номер дома ✅
  'GEOMETRIC_CENTER', // — центр улицы/района ⚠️
  'APPROXIMATE', // — очень приблизительно ❌
])

const AddressComponent = z.object({
  long_name: z.string(),
  short_name: z.string(),
  types: z.array(
    z.union([AddressComponentType, z.string() as z.ZodType<string & {}>])
  ),
})

const Location = z.object({ lat: z.number(), lng: z.number() })

const Geometry = z.object({
  location: Location,
  location_type: LocationType,
  viewport: z.object({
    northeast: Location,
    southwest: Location,
  }),
})

const PlusCode = z.object({
  global_code: z.string(),
  compound_code: z.string(),
})

const GeocodeResult = z.looseObject({
  types: z.array(z.union([AddressType, z.string() as z.ZodType<string & {}>])),
  formatted_address: z.string(),
  address_components: z.array(AddressComponent),
  geometry: Geometry,
  plus_code: PlusCode.optional(),
  partial_match: z.boolean().optional(),
  place_id: z.string(),
})

export const GeocodeResponse = z.object({
  status: z.enum([
    'OK',
    'ZERO_RESULTS',
    'OVER_DAILY_LIMIT',
    'OVER_QUERY_LIMIT',
    'REQUEST_DENIED',
    'INVALID_REQUEST',
    'UNKNOWN_ERROR',
  ]),
  results: z.array(GeocodeResult),
})

export type GeocodeLocationType = z.infer<typeof LocationType>
export type GeocodeAddressComponent = z.infer<typeof AddressComponent>
export type GeocodeResult = z.infer<typeof GeocodeResult>
export type GeocodeResponse = z.infer<typeof GeocodeResponse>
