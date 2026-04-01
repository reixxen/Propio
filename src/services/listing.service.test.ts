import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    listing: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    property: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/generated/prisma/client', () => ({
  PrismaClient: vi.fn(),
  PropertyStatus: { ACTIVE: 'ACTIVE' },
  Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } },
}))

vi.mock('natural', () => ({
  default: { PorterStemmerRu: { stem: (w: string) => w } },
}))

vi.mock('@/lib/string-similarity', () => ({
  stringSimilarity: () => ({
    compareTwoStrings: () => 0.5,
    findBestMatch: vi.fn(),
  }),
}))

import { ListingService } from './listing.service'
import type { Listing } from '@/models/listing'
import type { Listing as PrismaListing } from '@/generated/prisma/client'
import { PrismaClient } from '@/generated/prisma/client'

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    externalId: 'ext-1',
    externalUrl: 'https://example.com/1',
    description: 'test',
    images: ['https://example.com/img.jpg'],
    postedAt: new Date('2026-03-30'),
    rent: null,
    deposit: null,
    commission: null,
    utilityAmount: null,
    utilityIncluded: null,
    utilityCounters: null,
    rooms: null,
    area: null,
    floor: null,
    totalFloors: null,
    ...overrides,
  } as Listing
}

function prismaListing(
  propertyId: string,
  overrides: Partial<PrismaListing> = {}
): PrismaListing {
  return {
    id: crypto.randomUUID(),
    sourceId: 'src-1',
    propertyId,
    locationId: 'loc-1',
    externalId: 'ext-1',
    externalUrl: 'https://example.com/1',
    description: 'test',
    images: ['https://example.com/img.jpg'],
    postedAt: new Date('2026-03-30'),
    rent: null,
    deposit: null,
    commission: null,
    utilityAmount: null,
    utilityIncluded: null,
    utilityCounters: null,
    rooms: null,
    area: null,
    floor: null,
    totalFloors: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PrismaListing
}

describe('Listing Service', () => {
  let service: ListingService

  beforeEach(() => {
    service = new ListingService({} as PrismaClient)
  })

  describe('calculateFuzzyScore', () => {
    // ─── Real data: identical listings at пр. Ленина, 164 (Property a9a9a12f) ───
    it('scores 8.4 for identical rooms:1, floor:8, rent:18000', () => {
      const a = listing({ rooms: 1, floor: 8, rent: 18000 })
      const b = listing({ rooms: 1, floor: 8, rent: 18000 })
      // rooms +1.7, floor +3.2, rent +3.5
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(8.4)
    })

    // ─── Real data: пр. Ленина, 156/1 (Property 6929eed5) — full match with near rent ───
    it('scores 12.4 for rooms:2, floor:3, area:50, rent diff 2000', () => {
      const a = listing({ rooms: 2, floor: 3, area: 50, rent: 25000 })
      const b = listing({ rooms: 2, floor: 3, area: 50, rent: 23000 })
      // rooms +1.7, floor +3.2, area +6.0, rent +1.5 (1001..3000)
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(12.4)
    })

    // ─── Real data: пр. Ленина, 54/1 (Property 4c3b48ec) — all fields exact ───
    it('scores 14.4 for exact match rooms:2, floor:1, area:56, rent:30000', () => {
      const a = listing({ rooms: 2, floor: 1, area: 56, rent: 30000 })
      const b = listing({ rooms: 2, floor: 1, area: 56, rent: 30000 })
      // rooms +1.7, floor +3.2, area +6.0, rent +3.5
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(14.4)
    })

    // ─── Real data: ул. 50-летия Магнитки, 44/1 (Property 6594ee84) ───
    it('scores 8.4 for rooms:1, floor:3, rent:22000 identical', () => {
      const a = listing({ rooms: 1, floor: 3, rent: 22000 })
      const b = listing({ rooms: 1, floor: 3, rent: 22000 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(8.4)
    })

    // ─── Real data: ул. Суворова, 119/2 (Property 82f0be7e) ───
    it('scores 8.4 for rooms:2, floor:2, rent:23000 identical', () => {
      const a = listing({ rooms: 2, floor: 2, rent: 23000 })
      const b = listing({ rooms: 2, floor: 2, rent: 23000 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(8.4)
    })

    // ─── Real data: пр-т. К.Маркса, 202 (Property 91b08dfd) — rent diff 3000 now "near" ───
    it('gives near rent for diff 3000: rooms:2, floor:8, rent:29000 vs 26000', () => {
      const a = listing({ rooms: 2, floor: 8, rent: 29000 })
      const b = listing({ rooms: 2, floor: 8, rent: 26000 })
      // rooms +1.7, floor +3.2, rent +1.5 (diff 3000 in 1001..3000)
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(6.4)
    })

    // ─── Real data: ул. Уральская, 7/1 (Property 4c6ac0a9) — area match, no floor ───
    it('scores 9.2 for rooms:1, area:36, rent diff 2000', () => {
      const a = listing({ rooms: 1, area: 36, rent: 20000 })
      const b = listing({ rooms: 1, area: 36, rent: 22000 })
      // rooms +1.7, area +6.0, rent +1.5 (diff 2000 in 1001..3000)
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(9.2)
    })

    // ─── Real data: Советская 129/1 — разные квартиры: 1к vs 2к ───
    it('heavily penalizes rooms mismatch: rooms:1 vs rooms:2', () => {
      const candidate = listing({ rooms: 1, floor: 5, rent: 23000 })
      const reference = listing({ rooms: 2, floor: 5, rent: 28000 })
      // rooms -5.0, floor +3.2, rent -2.5 (diff 5000 > 3000)
      expect(service.calculateFuzzyScore(candidate, reference)).toBeCloseTo(-4.3)
    })

    // ─── Real data: Советская 213 — разные квартиры, соседние этажи ───
    it('uses near floor bonus for diff=1: rooms:1,floor:7 vs rooms:2,floor:8', () => {
      const candidate = listing({ rooms: 1, floor: 7, rent: 20000 })
      const reference = listing({ rooms: 2, floor: 8, rent: 25000 })
      // rooms -5.0, floor +1.0 (diff=1), rent -2.5 (diff 5000)
      expect(service.calculateFuzzyScore(candidate, reference)).toBeCloseTo(-6.5)
    })

    // ─── Real data: пр-т. К.Маркса, 231 (Property fb6cf9c2) — floor mismatch ───
    it('penalizes floor diff >= 2: rooms:1, floor:8 vs floor:5, rent:17k vs 18k', () => {
      const a = listing({ rooms: 1, floor: 8, rent: 17000 })
      const b = listing({ rooms: 1, floor: 5, rent: 18000 })
      // rooms +1.7, floor -4.0 (diff=3), rent +3.5 (diff 1000)
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(1.2)
    })

    // ─── Real data: пр-т. К.Маркса, 231 — rooms:0 vs rooms:1 now compared ───
    it('compares rooms:0 vs rooms:1 as mismatch (not skipped)', () => {
      const a = listing({ rooms: 0, floor: 7, rent: 19000 })
      const b = listing({ rooms: 1, floor: 5, rent: 18000 })
      // rooms -5.0 (0 ≠ 1), floor -4.0 (diff=2), rent +3.5 (diff 1000)
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(-5.5)
    })

    // ─── Real data: ул. Зеленый Лог, 15 (Property 39d54726) — rooms:0 vs rooms:0 ───
    it('matches rooms:0 vs rooms:0 (studios)', () => {
      const a = listing({ rooms: 0, rent: 16000 })
      const b = listing({ rooms: 0, rent: 16000 })
      // rooms +1.7 (0 === 0), rent +3.5
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(5.2)
    })

    // ─── Real data: ул. Жукова, 20 (Property 6e6dc0b9) — null rooms ───
    it('skips rooms when null, scores floor + rent', () => {
      const a = listing({ rooms: null, floor: 4, rent: 21000 })
      const b = listing({ rooms: null, floor: 4, rent: 20000 })
      // rooms skip, floor +3.2, rent +3.5 (diff 1000)
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(6.7)
    })

    it('returns 0 when all fields are null on both sides', () => {
      const a = listing({})
      const b = listing({})
      expect(service.calculateFuzzyScore(a, b)).toBe(0)
    })

    it('returns 0 when one side has values but other has all nulls', () => {
      const a = listing({ rooms: 2, floor: 5, area: 40, rent: 20000 })
      const b = listing({})
      expect(service.calculateFuzzyScore(a, b)).toBe(0)
    })

    it('area match boundary: diff=1 counts as match', () => {
      const a = listing({ area: 50 })
      const b = listing({ area: 51 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(6.0)
    })

    it('area mismatch boundary: diff=2 counts as mismatch', () => {
      const a = listing({ area: 50 })
      const b = listing({ area: 52 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(-2.0)
    })

    it('rent close boundary: diff=1000 → +3.5', () => {
      const a = listing({ rent: 20000 })
      const b = listing({ rent: 21000 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(3.5)
    })

    it('rent near boundary: diff=1001 → +1.5', () => {
      const a = listing({ rent: 20000 })
      const b = listing({ rent: 21001 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(1.5)
    })

    it('rent near upper boundary: diff=3000 → +1.5', () => {
      const a = listing({ rent: 20000 })
      const b = listing({ rent: 23000 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(1.5)
    })

    it('rent mismatch boundary: diff=3001 → -2.5', () => {
      const a = listing({ rent: 20000 })
      const b = listing({ rent: 23001 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(-2.5)
    })

    it('floor near: diff=1 → +1.0', () => {
      const a = listing({ floor: 5 })
      const b = listing({ floor: 6 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(1.0)
    })

    it('floor mismatch: diff=2 → -4.0', () => {
      const a = listing({ floor: 5 })
      const b = listing({ floor: 7 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(-4.0)
    })

    // ─── Description similarity ───

    it('adds +4.0 when descriptionSimilarity > 0.8 (re-post)', () => {
      const a = listing({ rooms: 1, floor: 5, rent: 18000 })
      const b = listing({ rooms: 1, floor: 5, rent: 18000 })
      // base = 1.7 + 3.2 + 3.5 = 8.4, + description +4.0 = 12.4
      expect(service.calculateFuzzyScore(a, b, 0.96)).toBeCloseTo(12.4)
    })

    it('adds nothing when descriptionSimilarity <= 0.8 (no penalty)', () => {
      const a = listing({ rooms: 1, rent: 18000 })
      const b = listing({ rooms: 1, rent: 18000 })
      const base = service.calculateFuzzyScore(a, b)
      expect(service.calculateFuzzyScore(a, b, 0.22)).toBeCloseTo(base)
      expect(service.calculateFuzzyScore(a, b, 0.59)).toBeCloseTo(base)
      expect(service.calculateFuzzyScore(a, b, 0.8)).toBeCloseTo(base)
    })

    it('adds nothing when descriptionSimilarity is undefined', () => {
      const a = listing({ rooms: 1, rent: 20000 })
      const b = listing({ rooms: 1, rent: 20000 })
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(5.2)
      expect(service.calculateFuzzyScore(a, b, undefined)).toBeCloseTo(5.2)
    })

    it('description match rescues floor mismatch: floor:8 vs floor:5 + similarity 0.96', () => {
      const a = listing({ rooms: 1, floor: 8, rent: 17000 })
      const b = listing({ rooms: 1, floor: 5, rent: 18000 })
      // base = 1.7 - 4.0 + 3.5 = 1.2 (below threshold)
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(1.2)
      // with description: 1.2 + 4.0 = 5.2 (above threshold)
      expect(service.calculateFuzzyScore(a, b, 0.96)).toBeCloseTo(5.2)
    })

    it('low similarity does not penalize borderline match', () => {
      const a = listing({ rooms: 1, rent: 16000 })
      const b = listing({ rooms: 1, rent: 15000 })
      // base = 1.7 + 3.5 = 5.2 (above threshold)
      expect(service.calculateFuzzyScore(a, b)).toBeCloseTo(5.2)
      // low similarity: still 5.2 (no penalty)
      expect(service.calculateFuzzyScore(a, b, 0.2)).toBeCloseTo(5.2)
    })
  })

  describe('findBestMatch', () => {
    // ─── Real data: Советская 213 — two different properties ───
    it('picks the correct property among candidates with different rooms/floors', () => {
      const candidates = [
        prismaListing('prop-1k', { rooms: 1, floor: 7, rent: 20000 }),
        prismaListing('prop-2k', { rooms: 2, floor: 8, rent: 25000 }),
      ]

      const ref1k = listing({ rooms: 1, floor: 7, rent: 20000 })
      expect(service.findBestMatch(candidates, ref1k)).toBe('prop-1k')

      const ref2k = listing({ rooms: 2, floor: 8, rent: 25000 })
      expect(service.findBestMatch(candidates, ref2k)).toBe('prop-2k')
    })

    // ─── Real data: Советская 129/1 — 1к vs 2к at same address ───
    it('picks rooms:2 candidate over rooms:1 when reference is 2-room', () => {
      const candidates = [
        prismaListing('prop-1k', { rooms: 1, floor: 5, rent: 23000 }),
        prismaListing('prop-2k', { rooms: 2, floor: 5, rent: 28000 }),
      ]

      const ref = listing({ rooms: 2, floor: 5, rent: 28000 })
      expect(service.findBestMatch(candidates, ref)).toBe('prop-2k')
    })

    // ─── Real data: пр. Ленина, 164 — identical listings ───
    it('returns propertyId for an exact match', () => {
      const candidates = [
        prismaListing('prop-A', { rooms: 1, floor: 8, rent: 18000 }),
      ]
      const ref = listing({ rooms: 1, floor: 8, rent: 18000 })
      expect(service.findBestMatch(candidates, ref)).toBe('prop-A')
    })

    // ─── Real data: пр. Ленина, 156/1 — full fields match ───
    it('returns propertyId when all four fields present and matching', () => {
      const candidates = [
        prismaListing('prop-full', {
          rooms: 2,
          floor: 3,
          area: 50,
          rent: 25000,
        }),
      ]
      const ref = listing({ rooms: 2, floor: 3, area: 50, rent: 23000 })
      expect(service.findBestMatch(candidates, ref)).toBe('prop-full')
    })

    it('returns null when no candidate exceeds threshold', () => {
      const candidates = [
        prismaListing('prop-bad', { rooms: 1, floor: 7, rent: 20000 }),
      ]
      const ref = listing({ rooms: 2, floor: 3, area: 50, rent: 30000 })
      expect(service.findBestMatch(candidates, ref)).toBeNull()
    })

    it('returns null for empty candidates array', () => {
      const ref = listing({ rooms: 1, floor: 5, rent: 20000 })
      expect(service.findBestMatch([], ref)).toBeNull()
    })

    it('returns null when score below threshold', () => {
      // rooms +1.7, rent +1.5 (diff 2000 in 1001..3000) = 3.2 < 5.0
      const candidates = [
        prismaListing('prop-X', { rooms: 1, rent: 18000 }),
      ]
      const ref = listing({ rooms: 1, rent: 16000 })
      expect(service.findBestMatch(candidates, ref)).toBeNull()
    })

    // ─── Multiple candidates, pick highest score ───
    it('picks candidate with highest score among many', () => {
      const candidates = [
        prismaListing('prop-poor', { rooms: 1, floor: 2, rent: 15000 }),
        prismaListing('prop-good', { rooms: 2, floor: 3, area: 50, rent: 24000 }),
        prismaListing('prop-mid', { rooms: 2, floor: 5, rent: 25000 }),
      ]
      const ref = listing({ rooms: 2, floor: 3, area: 50, rent: 25000 })
      expect(service.findBestMatch(candidates, ref)).toBe('prop-good')
    })
  })
})
