import { Listing } from '@/models/listing'
import z from 'zod'
import { SourceType } from '@/generated/prisma/enums'
import { $ZodError } from 'zod/v4/core'
import { AvitoScrapper } from './scrapper'
import { TransformedItem } from './parser'

export const AvitoListing = Listing.extend({
  externalId: z.number(),
  postedAt: z.number(),
  source: z.literal(SourceType.AVITO),
  lat: z.number(),
  lon: z.number(),
  city: z.string(),
  address: z.string(),
  district: z.string().nullish(),
})

export type AvitoListing = z.infer<typeof AvitoListing>

interface FetchListingsResult {
  listings: AvitoListing[]
  errors: { idx: number; id: number; error: $ZodError }[]
}

export class AvitoAdapter {
  constructor(private readonly scrapper: AvitoScrapper) {}

  async fetchListings(url: string): Promise<FetchListingsResult> {
    const page = await this.scrapper.fetchPage(url)

    const result: FetchListingsResult = {
      listings: [],
      errors: [],
    }

    for (const [idx, item] of page.items.entries()) {
      const mapped = this.mapAvitoToListing(item)
      const parsed = AvitoListing.safeParse(mapped)

      if (!parsed.success) {
        result.errors.push({ idx, id: item.id, error: parsed.error })
        continue
      }

      result.listings.push(parsed.data)
    }

    return result
  }

  private mapAvitoToListing(item: TransformedItem): AvitoListing {
    return {
      source: SourceType.AVITO,
      images: item.images,
      externalId: item.id,
      externalUrl: item.url,
      description: item.description,
      postedAt: item.postedAt,
      rent: item.price.value,
      deposit: item.price.deposit,
      commission: item.price.commission.amount,
      utilityAmount: item.utility.fixedAmount,
      utilityIncluded: item.utility.isIncluded,
      utilityCounters: item.utility.isCountersIncluded,
      rooms: item.rooms,
      area: item.area,
      floor: item.floor.count,
      totalFloors: item.floor.total,
      city: item.location.city,
      district: item.location.district,
      address: item.location.address,
      lat: item.location.lat,
      lon: item.location.lon,
    }
  }
}
