import { z } from 'zod'

const osmNodeMemberSchema = z.object({
  type: z.literal('node'),
  ref: z.number(),
  role: z.string(),
  lat: z.number(),
  lon: z.number(),
})

const osmWayMemberSchema = z.object({
  type: z.literal('way'),
  ref: z.number(),
  role: z.string(),
  geometry: z.array(z.object({ lat: z.number(), lon: z.number() })),
})

const osmMemberSchema = z.union([osmNodeMemberSchema, osmWayMemberSchema])

export const osmElementSchema = z.object({
  id: z.number(),
  type: z.literal('relation'),
  members: z.array(osmMemberSchema),
  tags: z.object({ name: z.string() }),
})

export const osmElementsSchema = z.array(osmElementSchema)

export type OsmMember = z.infer<typeof osmMemberSchema>
export type OsmElement = z.infer<typeof osmElementSchema>
export type OsmElements = z.infer<typeof osmElementsSchema>
