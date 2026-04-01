import { Prisma, PrismaClient } from '@/generated/prisma/client'
import prisma from '@/lib/db'
import { Location } from '@/models/location'

class LocationService {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrCreateLocation(params: {
    location: Location
    districtId?: string
  }) {
    const { location, districtId } = params

    try {
      const createdLocation = await this.prisma.location.create({
        data: {
          districtId,
          fullAddress: location.fullAddress,
          city: location.city,
          address: location.address,
          lon: location.lon,
          lat: location.lat,
        },
      })

      return createdLocation
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingLocation = await this.prisma.location.findUnique({
          where: { fullAddress: location.fullAddress },
        })

        return existingLocation
      }
      throw error
    }
  }
}

export const locationService = new LocationService(prisma)
