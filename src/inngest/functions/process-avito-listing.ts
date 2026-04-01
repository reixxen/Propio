import { SourceType } from '@/generated/prisma/client'
import { inngest } from '../client'
import { listingService } from '@/services/listing.service'
import { locationService } from '@/services/location.service'
import { listingReceived } from '../events'
import { GoogleMapsClient } from '@/integration/google-maps/client'
import { GoogleMapsAdapter } from '@/integration/google-maps/adapter'
import { env } from '@/env'
import { NonRetriableError } from 'inngest'
import { districtService } from '@/services/district.service'
import { epochMillisToDate, stringToNumber } from '@/lib/zod'

const googleMapsClient = new GoogleMapsClient(env.GOOGLE_API_KEY)
const googleMapsAdapter = new GoogleMapsAdapter(googleMapsClient)

export const processAvitoListing = inngest.createFunction(
  {
    id: 'process-avito-listing',
    triggers: [
      {
        event: listingReceived,
        if: `event.data.listing.source == '${SourceType.AVITO}'`,
      },
    ],
    concurrency: 1,
  },
  async ({ event, step }) => {
    const { sourceId, listing } = event.data

    // Should never happen
    if (listing.source !== SourceType.AVITO) {
      throw new NonRetriableError(`Not an Avito listing: ${listing.source}`)
    }

    const postedAt = epochMillisToDate.decode(listing.postedAt)
    const externalId = stringToNumber.encode(listing.externalId)

    const existingListing = await step.run(
      'find-existing-listing',
      async () => {
        return await listingService.findByExternalId(sourceId, externalId)
      }
    )
    if (existingListing) {
      return {
        skipped: true,
        reason: 'already_processed',
      }
    }

    const geoLocation = await step.run('geocode', async () => {
      // try to resolve by coords
      let location = await googleMapsAdapter.resolveByCoords(
        listing.lat,
        listing.lon
      )

      if (location) return location

      // if no location found by coords, try to resolve by address
      location = await googleMapsAdapter.resolveByAddress(
        listing.address,
        listing.city
      )

      return location
    })

    if (!geoLocation) {
      // return {
      //   skipped: true,
      //   reason: 'no_geocode_found',
      //   address: listing.address,
      // }
      throw new NonRetriableError('No geocode found for address')
    }

    const district = await step.run('identify-district', async () => {
      return await districtService.identifyDistrict(
        geoLocation.city,
        geoLocation.lon,
        geoLocation.lat
      )
    })

    const location = await step.run('ensure-location', async () => {
      return await locationService.findOrCreateLocation({
        districtId: district ? district.id : undefined,
        location: {
          address: geoLocation.address,
          city: geoLocation.city,
          fullAddress: geoLocation.fullAddress,
          lat: geoLocation.lat,
          lon: geoLocation.lon,
        },
      })
    })

    if (!location) {
      throw new NonRetriableError(
        `Failed to create location for: ${geoLocation.fullAddress}`
      )
    }

    return await step.run('create-listing-with-property', async () => {
      return await listingService.createWithProperty({
        listing: {
          externalId: externalId,
          externalUrl: listing.externalUrl,
          images: listing.images,
          postedAt: postedAt,
          description: listing.description,
          rent: listing.rent,
          deposit: listing.deposit,
          commission: listing.commission,
          utilityAmount: listing.utilityAmount,
          utilityIncluded: listing.utilityIncluded,
          utilityCounters: listing.utilityCounters,
          rooms: listing.rooms,
          area: listing.area,
          floor: listing.floor,
          totalFloors: listing.totalFloors,
        },
        locationId: location.id,
        sourceId: sourceId,
      })
    })
  }
)
