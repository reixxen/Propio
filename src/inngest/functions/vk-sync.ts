import { sourceService } from '@/services/source.service'
import { inngest } from '../client'
import { SourceType } from '@/generated/prisma/enums'
import { NonRetriableError } from 'inngest'
import { VkAdapter } from '@/integration/vk/adapter'
import { VkClient } from '@/integration/vk/client'
import { env } from '@/env'
import { listingReceived, vkSyncRequest } from '../events'

const vkClient = new VkClient(env.VK_ACCESS_TOKEN)
const vkAdapter = new VkAdapter(vkClient)

export const syncVkGroup = inngest.createFunction(
  {
    id: 'sync-vk-group',
    triggers: [
      {
        event: vkSyncRequest,
      },
    ],
  },
  async ({ event, step }) => {
    const source = await step.run('find-source', async () => {
      return await sourceService.findByTypeAndKey(SourceType.VK, event.data.key)
    })

    if (!source) {
      throw new NonRetriableError('Source not found')
    }

    const result = await step.run('fetch-listings', async () => {
      return await vkAdapter.fetchListings(event.data.key, {
        city: event.data.city,
        filter: {
          keywords: {
            whitelist: [/квартир/i, /студи/i, /евродвушк/i],
            blacklist: [
              /\bсад\b/i,
              /\bСНТ\b/i,
              /теплиц/i,
              /хозблок/i,
              /посадк/i,
              /продаж/i,
            ],
          },
        },
      })
    })

    const events = result.listings.map((listing) => {
      return listingReceived.create({
        sourceId: source.id,
        listing: listing,
      })
    })

    const { ids } = await step.sendEvent('send-listing-received-events', events)

    return {
      eventIds: ids,
      skipped: result.skipped,
      errors: result.errors,
    }
  }
)
