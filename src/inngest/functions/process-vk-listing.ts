import { SourceType } from '@/generated/prisma/client'
import { inngest } from '../client'
import { listingService } from '@/services/listing.service'
import { locationService } from '@/services/location.service'
import { listingReceived } from '../events'
import { GoogleMapsClient } from '@/integration/google-maps/client'
import { GoogleMapsAdapter } from '@/integration/google-maps/adapter'
import { env } from '@/env'
import { aiService } from '@/services/ai/ai.service'
import { NonRetriableError } from 'inngest'
import { districtService } from '@/services/district.service'
import { epochSecondsToDate, stringToNumber } from '@/lib/zod'

const googleMapsClient = new GoogleMapsClient(env.GOOGLE_API_KEY)
const googleMapsAdapter = new GoogleMapsAdapter(googleMapsClient)

export const processVkListing = inngest.createFunction(
  {
    id: 'process-vk-listing',
    triggers: [
      {
        event: listingReceived,
        if: `event.data.listing.source == '${SourceType.VK}'`,
      },
    ],
    concurrency: 1,
  },
  async ({ event, step }) => {
    const { sourceId, listing } = event.data

    // Should never happen
    if (listing.source !== SourceType.VK) {
      throw new NonRetriableError(`Not a VK listing: ${listing.source}`)
    }

    const postedAt = epochSecondsToDate.decode(listing.postedAt)
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

    const classification = await step.run('classify-listing', async () => {
      return aiService.classifyVkListing(listing.description)
    })

    if (!classification.isRelevant) {
      return {
        skipped: true,
        reason: 'not_relevant',
        detail: classification.reason,
      }
    }

    const aiResult = await step.run('parse-with-ai', async () => {
      return aiService.parseVkListing(listing.description)
    })

    if (!aiResult.address || !aiResult.address.trim()) {
      // return { skipped: true, reason: 'no_address' }
      throw new NonRetriableError('No address found in ai result')
    }

    const geoLocation = await step.run('geocode', async () => {
      return await googleMapsAdapter.resolveByAddress(
        aiResult.address!,
        listing.city
      )
    })

    if (!geoLocation) {
      // return {
      //   skipped: true,
      //   reason: 'no_geocode_found',
      //   address: aiResult.address,
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
          rent: aiResult.rent,
          deposit: aiResult.deposit,
          commission: aiResult.commission,
          utilityAmount: aiResult.utilityAmount,
          utilityIncluded: aiResult.utilityIncluded,
          utilityCounters: aiResult.utilityCounters === 'tenant',
          rooms: aiResult.rooms,
          area: aiResult.area,
          floor: aiResult.floor,
          totalFloors: aiResult.totalFloors,
        },
        locationId: location.id,
        sourceId: sourceId,
      })
    })
  }
)
