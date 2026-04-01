import { Prisma, PrismaClient } from '@/generated/prisma/client'
import prisma from '@/lib/db'
import { District } from '@/models/district'
import { point as turfPoint } from '@turf/helpers'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { MultiPolygon, Polygon } from 'geojson'
import db from '@/db'
import { sql } from 'drizzle-orm'

class DistrictService {
  constructor(private readonly prisma: PrismaClient) {}

  async identifyDistrict(city: string, lon: number, lat: number) {
    // В будущем здесь лучше использовать пространственный индекс БД (PostGIS)
    const districts = await this.prisma.district.findMany({
      where: { city },
      select: {
        id: true,
        name: true,
        geometry: true,
      },
    })

    const point = turfPoint([lon, lat])

    for (const district of districts) {
      const geometry = district.geometry as unknown as Polygon | MultiPolygon

      if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
        continue
      }

      if (booleanPointInPolygon(point, geometry)) {
        return { id: district.id, name: district.name }
      }
    }

    return null
  }

  async upsertDistricts(districts: District[]) {
    const operations = districts.map((district) => {
      return this.prisma.district.upsert({
        where: { id: district.id },
        update: {
          name: district.name,
          slug: district.slug,
          city: district.city,
          center: district.center,
          geometry: district.geometry as unknown as Prisma.JsonNullValueInput,
        },
        create: {
          id: district.id,
          name: district.name,
          slug: district.slug,
          city: district.city,
          center: district.center,
          geometry: district.geometry as unknown as Prisma.JsonNullValueInput,
        },
      })
    })

    return await this.prisma.$transaction(operations)
  }
}

export const districtService = new DistrictService(prisma)
