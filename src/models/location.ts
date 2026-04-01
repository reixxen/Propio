import z from 'zod'

export const LocationSchema = z.object({
  fullAddress: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
})

export type Location = z.infer<typeof LocationSchema>
