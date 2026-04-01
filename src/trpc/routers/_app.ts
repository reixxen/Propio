import { createTRPCRouter } from '../init'
import { propertiesRouter } from '@/features/properties/server/router'

export const appRouter = createTRPCRouter({
  properties: propertiesRouter,
})

export type AppRouter = typeof appRouter
