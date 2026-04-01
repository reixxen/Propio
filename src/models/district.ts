import z from 'zod'

const Position = z.array(z.number()).length(2)

const Polygon = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(Position)).min(1),
})

const MultiPolygon = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(Position))).min(1),
})

const Geometry = z.union([Polygon, MultiPolygon])

export const District = z.object({
  id: z.string().min(1),
  city: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  center: Position,
  geometry: Geometry,
})

export type District = z.infer<typeof District>
