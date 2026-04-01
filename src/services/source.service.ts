import { PrismaClient } from '@/generated/prisma/client'
import { SourceType } from '@/generated/prisma/enums'
import prisma from '@/lib/db'

class SourceService {
  constructor(private readonly prisma: PrismaClient) {}

  async findByType(type: SourceType) {
    const sources = await this.prisma.source.findMany({
      where: { type },
    })

    return sources
  }

  async findByTypeAndKey(type: SourceType, key: string) {
    const source = await this.prisma.source.findUnique({
      where: {
        type_key: {
          type,
          key,
        },
      },
    })

    return source
  }
}

export const sourceService = new SourceService(prisma)
