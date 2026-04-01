import { z } from 'zod'

const ImageSize = z.enum([
  '864x864',
  '636x636',
  '472x472',
  '432x432',
  '416x416',
  '318x318',
  '236x236',
  '208x208',
])

const Iva = z.object({
  AutoParamsStep: z.array(
    z.object({ payload: z.object({ text: z.string() }) })
  ),
})

export const AvitoItem = z.object({
  id: z.number(),
  isVerifiedItem: z.boolean(),
  urlPath: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
  }),
  location: z.object({
    id: z.number(),
    name: z.string(),
    namePrepositional: z.string(),
    isCurrent: z.boolean(),
    isRegion: z.boolean(),
  }),
  sortTimeStamp: z.number(),
  allowTimeStamp: z.number(),
  priceDetailed: z.object({
    postfix: z.string(),
    value: z.number(),
  }),
  images: z.array(z.record(ImageSize, z.url())),
  imagesCount: z.number(),
  isFavorite: z.boolean(),
  isNew: z.boolean(),
  geo: z.object({
    geoReferences: z.array(z.object({ content: z.string() })),
    formattedAddress: z.string(),
  }),
  isMarketplace: z.boolean(),
  iva: Iva,
  coords: z.object({
    lat: z.coerce.number<number>(),
    lng: z.coerce.number<number>(),
    address_user: z.string(),
  }),
  type: z.literal('item'),
})

export const AvitoPage = z.object({
  i18n: z.object({
    hasMessages: z.boolean(),
    locale: z.string(),
  }),
  state: z.object({
    data: z.object({
      url: z.string(),
      catalog: z.object({
        items: z.array(
          z.union([AvitoItem, z.object({ type: z.literal('banner') })])
        ),
        pager: z.object({
          next: z.string().nullable(),
          last: z.string().nullable(),
          current: z.number(),
          pages: z.record(z.string(), z.string()),
        }),
      }),
    }),
  }),
})

export type AvitoItem = z.infer<typeof AvitoItem>
export type AvitoPage = z.infer<typeof AvitoPage>
