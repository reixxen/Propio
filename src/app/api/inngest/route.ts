import { inngest } from '@/inngest/client'
import { processAvitoListing } from '@/inngest/functions/process-avito-listing'
import { processVkListing } from '@/inngest/functions/process-vk-listing'
import { syncAvito } from '@/inngest/functions/avito-sync'
import { syncVkGroup } from '@/inngest/functions/vk-sync'
import { serve } from 'inngest/next'
import { vkCronScheduler } from '@/inngest/functions/vk-cron'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    vkCronScheduler,
    syncVkGroup,
    syncAvito,
    processVkListing,
    processAvitoListing,
  ],
})
