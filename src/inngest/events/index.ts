import { AvitoListing } from '@/integration/avito/adapter'
import { VkListing } from '@/integration/vk/adapter'
import { eventType } from 'inngest'
import { z } from 'zod'

export const listingReceived = eventType('app/listing.received', {
  schema: z.object({
    sourceId: z.string(),
    listing: z.union([AvitoListing, VkListing]),
  }),
})

export const vkSyncRequest = eventType('app/vk.sync.requested', {
  schema: z.object({
    key: z.string(),
    city: z.string(),
  }),
})
