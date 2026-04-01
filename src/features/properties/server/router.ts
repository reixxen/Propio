import { PropertyStatus, SourceType } from '@/generated/prisma/client'
import { baseProcedure, createTRPCRouter } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import z from 'zod'

const propertyResponseSchema = z.object({
  id: z.string(),
  rent: z.number(),
  deposit: z.number().nullish(),
  commission: z.number().nullish(),
  rooms: z.number().nullish(),
  area: z.number().nullish(),
  floor: z.number().nullish(),
  totalFloors: z.number().nullish(),
  utilityAmount: z.number().nullish(),
  utilityIncluded: z.boolean().nullish(),
  utilityCounters: z.boolean().nullish(),
  images: z.array(z.string()),
  postedAt: z.date(),
  sources: z.array(
    z.object({
      id: z.string(),
      type: z.enum(SourceType),
      key: z.string(),
      url: z.string(),
    })
  ),
  location: z.object({
    city: z.string(),
    address: z.string(),
    fullAddress: z.string(),
    district: z
      .object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      })
      .nullish(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const propertiesRouter = createTRPCRouter({
  findMany: baseProcedure
    .output(z.array(propertyResponseSchema))
    .query(async ({ ctx }) => {
      const properties = await ctx.prisma.property.findMany({
        where: { status: PropertyStatus.ACTIVE },
        orderBy: { updatedAt: 'desc' },
        include: {
          listings: {
            orderBy: { postedAt: 'desc' },
            include: {
              location: { include: { district: true } },
              source: true,
            },
          },
        },
      })

      return properties.map((property) => {
        const listing = property.listings[0]!

        return {
          id: property.id,
          rent: listing.rent,
          deposit: listing.deposit,
          commission: listing.commission,
          rooms: listing.rooms,
          area: listing.area,
          floor: listing.floor,
          totalFloors: listing.totalFloors,
          utilityAmount: listing.utilityAmount,
          utilityIncluded: listing.utilityIncluded,
          utilityCounters: listing.utilityCounters,
          images: listing.images,
          postedAt: listing.postedAt,
          sources: property.listings.map((listing) => ({
            id: listing.source.id,
            type: listing.source.type,
            key: listing.source.key,
            url: listing.externalUrl,
          })),
          location: {
            city: listing.location.city,
            address: listing.location.address,
            fullAddress: listing.location.fullAddress,
            district: listing.location.district
              ? {
                  id: listing.location.district.id,
                  name: listing.location.district.name,
                  slug: listing.location.district.slug,
                }
              : null,
          },
          createdAt: property.createdAt,
          updatedAt: property.updatedAt,
        }
      })
    }),
  findUnique: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const property = await ctx.prisma.property.findUnique({
        where: { id: input.id },
        include: {
          listings: {
            orderBy: { postedAt: 'desc' },
            include: {
              location: { include: { district: true } },
              source: true,
            },
          },
        },
      })

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const latest = property.listings[0]

      return {
        id: property.id,
        status: property.status,
        rent: latest?.rent ?? null,
        deposit: latest?.deposit ?? null,
        commission: latest?.commission ?? null,
        rooms: latest?.rooms ?? null,
        area: latest?.area ?? null,
        floor: latest?.floor ?? null,
        totalFloors: latest?.totalFloors ?? null,
        utilityAmount: latest?.utilityAmount ?? null,
        utilityIncluded: latest?.utilityIncluded ?? null,
        utilityCounters: latest?.utilityCounters ?? null,
        images: latest?.images ?? [],
        location: latest?.location
          ? {
              city: latest.location.city,
              address: latest.location.address,
              fullAddress: latest.location.fullAddress,
              lat: latest.location.lat,
              lon: latest.location.lon,
              district: latest.location.district
                ? {
                    id: latest.location.district.id,
                    name: latest.location.district.name,
                    slug: latest.location.district.slug,
                  }
                : null,
            }
          : null,
        listings: property.listings.map((l) => ({
          id: l.id,
          externalUrl: l.externalUrl,
          description: l.description,
          images: l.images,
          postedAt: l.postedAt,
          rent: l.rent,
          deposit: l.deposit,
          commission: l.commission,
          rooms: l.rooms,
          area: l.area,
          floor: l.floor,
          totalFloors: l.totalFloors,
          utilityAmount: l.utilityAmount,
          utilityIncluded: l.utilityIncluded,
          utilityCounters: l.utilityCounters,
          source: {
            id: l.source.id,
            type: l.source.type,
            key: l.source.key,
          },
          location: {
            city: l.location.city,
            address: l.location.address,
            fullAddress: l.location.fullAddress,
          },
        })),
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
      }
    }),
})
