import { ZodError } from 'zod'
import { AvitoItem, AvitoPage } from './models'
import { decode } from 'html-entities'
import z from 'zod'

// Hoisted regexes
const RE_ROOMS = /(\d+)\s*-к/i
const RE_STUDIO = /студия/i
const RE_AREA = /(\d+[,\d\s.]*)\s*м[²2]/i
const RE_FLOOR = /(\d+)\/(\d+)\s*эт/i
const RE_DIGITS = /(\d[\d\s]*)/
const RE_DISTRICT = /р-н\s*/i

function extractInt(str: string): number {
  const val = RE_DIGITS.exec(str)?.[1]?.replace(/\s/g, '') ?? null
  return val !== null ? parseInt(val, 10) : 0
}

function parseTitle(val: string) {
  const roomsMatch = RE_ROOMS.exec(val)
  const floorMatch = RE_FLOOR.exec(val)
  const areaMatch = RE_AREA.exec(val)
  const areaValue =
    areaMatch?.[1]?.replace(/[^0-9,.]/g, '').replace(',', '.') ?? ''

  return {
    rooms: RE_STUDIO.test(val)
      ? 0
      : roomsMatch
        ? extractInt(roomsMatch[1] ?? '')
        : null,
    area: areaValue !== '' ? parseFloat(areaValue) : null,
    floor: {
      count: floorMatch ? extractInt(floorMatch[1] ?? '') : null,
      total: floorMatch ? extractInt(floorMatch[2] ?? '') : null,
    },
  }
}

function parseParams(parts: string[]) {
  const normalized = parts
    .flatMap((p) => p.split('·'))
    .map((p) =>
      p
        .replace(/\u00A0/g, ' ')
        .trim()
        .toLowerCase()
    )

  const depositPart = normalized.find((p) => p.includes('залог'))
  const commissionPart = normalized.find(
    (p) => p.includes('комисси') && !p.includes('без')
  )
  const utilityPart = normalized.find((p) => p.includes('жку'))

  const commissionRatio = commissionPart
    ? extractInt(commissionPart) / 100
    : null

  return {
    deposit: depositPart
      ? depositPart.includes('без')
        ? 0
        : extractInt(depositPart)
      : null,
    commissionRatio,
    utility: utilityPart
      ? {
          fixed: extractInt(utilityPart),
          isIncluded: utilityPart.includes('включены'),
          isCountersIncluded:
            utilityPart.includes('все') ||
            (utilityPart.includes('счетчик') &&
              !utilityPart.includes('без счетчик')),
        }
      : null,
  }
}

export const TransformedItem = AvitoItem.transform((item) => {
  const title = parseTitle(item.title)
  const paramsText = item.iva.AutoParamsStep.map((p) => p.payload.text)
  const params = parseParams(paramsText)
  const images = item.images
    .map((image) => Object.values(image)[0])
    .filter((url): url is string => url !== undefined && url !== null)
  const district = item.geo.geoReferences
    .find((r) => RE_DISTRICT.test(r.content))
    ?.content.replace(RE_DISTRICT, '')

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    paramsText: paramsText.join(' | '),
    url: `https://www.avito.ru/${item.urlPath}`,
    postedAt: item.sortTimeStamp,
    rooms: title.rooms,
    area: title.area,
    floor: title.floor,
    price: {
      value: item.priceDetailed.value,
      postfix: item.priceDetailed.postfix,
      deposit: params.deposit,
      commission: {
        ratio: params.commissionRatio,
        amount: params.commissionRatio
          ? Math.round(item.priceDetailed.value * params.commissionRatio)
          : null,
      },
    },
    utility: {
      fixedAmount: params.utility?.fixed ?? null,
      isIncluded: params.utility?.isIncluded ?? null,
      isCountersIncluded: params.utility?.isCountersIncluded ?? null,
    },
    images,
    location: {
      city: item.location.name,
      district,
      address: item.geo.formattedAddress,
      lat: item.coords.lat,
      lon: item.coords.lng,
    },
  }
})

export type TransformedItem = z.infer<typeof TransformedItem>

export function extractMfeState(html: string) {
  const re =
    /<script[^>]+type="mime\/invalid"[^>]+data-mfe-state="true"[^>]*>([\s\S]*?)<\/script>/gi

  for (const match of html.matchAll(re)) {
    const content = match[1]
    if (!content) continue

    try {
      const json = JSON.parse(decode(content))

      if (!json?.state?.data?.catalog) continue

      const result = AvitoPage.safeParse(json, { reportInput: true })
      if (!result.success) throw result.error
      return result.data
    } catch (e) {
      if (e instanceof ZodError) throw e
      continue
    }
  }

  throw new Error('MFE state with catalog not found in HTML response')
}
