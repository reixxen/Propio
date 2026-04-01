import { VkClient } from './client'
import { Listing } from '@/models/listing'
import z from 'zod'
import { SourceType } from '@/generated/prisma/enums'
import { $ZodError } from 'zod/v4/core'
import { Item } from './models'

interface KeywordsFilter {
  blacklist?: RegExp[]
  whitelist?: RegExp[]
}

interface ItemFilter {
  maxAgeMinutes?: number
  keywords?: KeywordsFilter
}

export const VkListing = Listing.pick({
  externalUrl: true,
  description: true,
  images: true,
}).extend({
  externalId: z.number(),
  postedAt: z.number(),
  source: z.literal(SourceType.VK),
  city: z.string(),
})

export type VkListing = z.infer<typeof VkListing>

interface FetchListingsResult {
  listings: VkListing[]
  skipped: {
    idx: number
    id: number
    reason:
      | 'advertisement'
      | 'outdated'
      | 'blacklisted'
      | 'missed_whitelist'
      | 'no_images'
  }[]
  errors: { idx: number; id: number; error: $ZodError }[]
}

export class VkAdapter {
  constructor(private readonly client: VkClient) {}

  async fetchListings(
    domain: string,
    config: { city: string; filter?: ItemFilter }
  ): Promise<FetchListingsResult> {
    const { city, filter } = config
    const result: FetchListingsResult = {
      listings: [],
      skipped: [],
      errors: [],
    }

    const { items } = await this.client.fetchWall(domain)

    const now = Date.now()
    const cutoffMs = filter?.maxAgeMinutes
      ? now - filter.maxAgeMinutes * 60 * 1000
      : null

    for (const [idx, item] of items.entries()) {
      if (!item) continue

      // Ads check
      if (item.marked_as_ads === 1) {
        result.skipped.push({ idx, id: item.id, reason: 'advertisement' })
        continue
      }

      // Time filter
      if (cutoffMs && item.date * 1000 < cutoffMs) {
        result.skipped.push({ idx, id: item.id, reason: 'outdated' })
        break
      }

      // Images filter
      if (!item.attachments?.some((a) => a.type === 'photo')) {
        result.skipped.push({ idx, id: item.id, reason: 'no_images' })
        continue
      }

      // Keywords
      if (
        filter?.keywords?.blacklist?.length &&
        this.matchesKeywords(item.text, filter?.keywords?.blacklist)
      ) {
        result.skipped.push({ idx, id: item.id, reason: 'blacklisted' })
        continue
      }
      if (
        filter?.keywords?.whitelist?.length &&
        !this.matchesKeywords(item.text, filter.keywords.whitelist)
      ) {
        result.skipped.push({ idx, id: item.id, reason: 'missed_whitelist' })
        continue
      }

      const listing = this.mapItemToListing(item, city)
      const parseResult = VkListing.safeParse(listing, { reportInput: true })

      if (!parseResult.success) {
        result.errors.push({ idx, id: item.id, error: parseResult.error })
        continue
      }

      result.listings.push(parseResult.data)
    }

    return result
  }

  private matchesKeywords(text: string, keywords: RegExp[]): boolean {
    return keywords.some((pattern) => pattern.test(text))
  }

  private mapItemToListing(item: Item, city: string): VkListing {
    return {
      source: SourceType.VK,
      externalId: item.id,
      externalUrl: `https://vk.ru/wall${item.owner_id}_${item.id}`,
      description: item.text,
      images: this.extractImages(item.attachments),
      city: city,
      postedAt: item.date,
    }
  }

  private extractImages(attachments: Item['attachments']): string[] {
    const urls = []

    for (const attachment of attachments) {
      if (attachment.type === 'photo') {
        urls.push(attachment.photo.orig_photo.url)
      }
    }

    return urls
  }
}
