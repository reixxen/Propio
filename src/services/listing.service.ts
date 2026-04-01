import {
  Prisma,
  PrismaClient,
  PropertyStatus,
  Listing as PrismaListing,
} from '@/generated/prisma/client'
import prisma from '@/lib/db'
import { stringSimilarity } from '@/lib/string-similarity'
import { Listing } from '@/models/listing'
import natural from 'natural'

const stemmer = natural.PorterStemmerRu

const descSimilarity = stringSimilarity((text) =>
  text
    .toLowerCase()
    .replace(/[^а-яёa-z0-9]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map((word) => stemmer.stem(word))
    .join('')
)

// prettier-ignore
const FS_WEIGHTS = {
  rooms:       { match: 1.7,            mismatch: -5.0 },
  floor:       { match: 3.2, near: 1.0, mismatch: -4.0 },
  area:        { match: 6.0,            mismatch: -2.0 },
  rent:        { close: 3.5, near: 1.5, mismatch: -2.5 },
  description: { match: 4.0 },
}

const MATCH_THRESHOLD = 5.0

export class ListingService {
  constructor(private readonly prisma: PrismaClient) {}

  calculateFuzzyScore(
    candidate: Listing,
    reference: Listing,
    descriptionSimilarity?: number
  ) {
    let score = 0.0

    if (candidate.rooms != null && reference.rooms != null) {
      score +=
        candidate.rooms === reference.rooms
          ? FS_WEIGHTS.rooms.match
          : FS_WEIGHTS.rooms.mismatch
    }

    if (candidate.floor != null && reference.floor != null) {
      const diff = Math.abs(candidate.floor - reference.floor)
      if (diff === 0) score += FS_WEIGHTS.floor.match
      else if (diff === 1) score += FS_WEIGHTS.floor.near
      else score += FS_WEIGHTS.floor.mismatch
    }

    if (candidate.area != null && reference.area != null) {
      const diff = Math.abs(candidate.area - reference.area)
      score += diff <= 1 ? FS_WEIGHTS.area.match : FS_WEIGHTS.area.mismatch
    }

    if (candidate.rent != null && reference.rent != null) {
      const diff = Math.abs(candidate.rent - reference.rent)
      if (diff <= 1000) score += FS_WEIGHTS.rent.close
      else if (diff <= 3000) score += FS_WEIGHTS.rent.near
      else score += FS_WEIGHTS.rent.mismatch
    }

    if (descriptionSimilarity != null && descriptionSimilarity > 0.8) {
      score += FS_WEIGHTS.description.match
    }

    return score
  }

  findBestMatch(candidates: PrismaListing[], reference: Listing) {
    let propertyId: string | null = null
    let bestScore = -Infinity

    for (const c of candidates) {
      const similarity = descSimilarity.compareTwoStrings(
        c.description,
        reference.description
      )
      const score = this.calculateFuzzyScore(c, reference, similarity)
      if (score > bestScore) {
        bestScore = score
        propertyId = c.propertyId
      }
    }

    return bestScore >= MATCH_THRESHOLD ? propertyId : null
  }

  async createWithProperty(params: {
    sourceId: string
    locationId: string
    listing: Listing
  }) {
    const { listing, locationId, sourceId } = params

    return await this.prisma.$transaction(
      async (tx) => {
        const listings = await tx.listing.findMany({
          where: {
            locationId,
            property: { status: PropertyStatus.ACTIVE },
          },
        })

        let propertyId = this.findBestMatch(listings, listing)

        if (!propertyId) {
          const createdProperty = await tx.property.create({
            data: { status: PropertyStatus.ACTIVE },
          })

          propertyId = createdProperty.id
        }

        return await tx.listing.create({
          data: {
            sourceId,
            propertyId,
            locationId,
            description: listing.description,
            externalId: listing.externalId,
            externalUrl: listing.externalUrl,
            images: listing.images,
            postedAt: listing.postedAt,
            rent: listing.rent,
            deposit: listing.deposit,
            commission: listing.commission,
            utilityAmount: listing.utilityAmount,
            utilityIncluded: listing.utilityIncluded,
            utilityCounters: listing.utilityCounters,
            rooms: listing.rooms,
            area: listing.area,
            floor: listing.floor,
            totalFloors: listing.totalFloors,
          },
        })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  }

  async findByExternalId(sourceId: string, externalId: string) {
    return await this.prisma.listing.findUnique({
      where: { sourceId_externalId: { sourceId, externalId } },
    })
  }
}

export const listingService = new ListingService(prisma)
