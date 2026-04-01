import { sourceService } from '@/services/source.service'
import { inngest } from '../client'
import { vkSyncRequest } from '../events'
import { SourceType } from '@/generated/prisma/enums'

export const vkCronScheduler = inngest.createFunction(
  { id: 'vk-cron-scheduler', triggers: [{ cron: '0 * * * *' }] },
  async ({ step }) => {
    const sources = await step.run('get-vk-sources', async () => {
      return await sourceService.findByType(SourceType.VK)
    })

    const events = sources.map((source) => {
      return vkSyncRequest.create({
        key: source.key,
        city: 'Магнитогорск',
      })
    })

    const { ids } = await step.sendEvent('dispatch-vk-syncs', events)

    return { eventIds: ids }
  }
)
