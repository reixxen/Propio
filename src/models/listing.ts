import { z } from 'zod'

export const Listing = z.object({
  externalId: z.string().min(1),
  externalUrl: z.url(),
  description: z.string().min(1),
  images: z.array(z.url()).min(1),
  postedAt: z.date(),
  rent: z.int().positive(),
  deposit: z.int().nonnegative().nullish(),
  commission: z.int().nonnegative().nullish(),
  utilityAmount: z.int().nonnegative().nullish(),
  utilityIncluded: z.boolean().nullish(),
  utilityCounters: z.boolean().nullish(),
  rooms: z.int().nonnegative().nullish(),
  area: z.int().nonnegative().nullish(),
  floor: z.int().nonnegative().nullish(),
  totalFloors: z.int().nonnegative().nullish(),
})

export type Listing = z.infer<typeof Listing>
