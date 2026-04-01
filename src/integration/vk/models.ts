import { z } from 'zod'

const PhotoSizeType = z.enum([
  's',
  'm',
  'x',
  'y',
  'z',
  'w',
  'o',
  'p',
  'q',
  'r',
  'base',
])

const PhotoSize = z.object({
  height: z.number(),
  width: z.number(),
  url: z.url(),
  type: PhotoSizeType,
})

const OrigPhoto = PhotoSize.extend({ type: PhotoSizeType.extract(['base']) })

const Photo = z.object({
  album_id: z.number(),
  date: z.number(),
  id: z.number(),
  owner_id: z.number(),
  access_key: z.string().optional(),
  sizes: z.array(PhotoSize),
  text: z.string().optional(),
  user_id: z.number().optional(),
  web_view_token: z.string(),
  has_tags: z.boolean(),
  orig_photo: OrigPhoto,
})

const Attachment = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('photo'),
    photo: Photo,
  }),
  z.object({
    type: z.literal('video'),
  }),
  z.object({
    type: z.literal('link'),
  }),
])

const Item = z.object({
  inner_type: z.enum(['wall_wallpost']),
  marked_as_ads: z.union([z.literal(0), z.literal(1)]),
  type: z.enum(['post']),
  attachments: z.array(Attachment),
  date: z.number(),
  from_id: z.number(),
  id: z.number(),
  owner_id: z.number(),
  post_type: z.enum(['post']),
  text: z.string(),
})

export const WallResponse = z.object({
  count: z.number(),
  items: z.array(Item),
})

export type Item = z.infer<typeof Item>
export type WallResponse = z.infer<typeof WallResponse>
