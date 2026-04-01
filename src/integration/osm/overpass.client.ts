import z from 'zod'

const OverpassMember = z.object({
  type: z.enum(['node', 'way', 'relation']),
  ref: z.number(),
  role: z.string(),
})

const OverpassTags = z.record(z.string(), z.string())

const OverpassNode = z.object({
  type: z.literal('node'),
  id: z.number(),
  lat: z.number(),
  lon: z.number(),
  tags: OverpassTags.optional(),
})

const OverpassWay = z.object({
  type: z.literal('way'),
  id: z.number(),
  nodes: z.array(z.number()),
  tags: OverpassTags.optional(),
})

const OverpassRelation = z.object({
  type: z.literal('relation'),
  id: z.number(),
  members: z.array(OverpassMember),
  tags: OverpassTags.optional(),
})

const OverpassElement = z.discriminatedUnion('type', [
  OverpassNode,
  OverpassWay,
  OverpassRelation,
])

export const OverpassResponse = z.looseObject({
  version: z.number(),
  generator: z.string(),
  elements: z.array(OverpassElement),
})

export type OverpassResponse = z.infer<typeof OverpassResponse>
export type OverpassElement = z.infer<typeof OverpassElement>
export type OverpassNode = z.infer<typeof OverpassNode>
export type OverpassWay = z.infer<typeof OverpassWay>
export type OverpassRelation = z.infer<typeof OverpassRelation>

const API_URL = 'https://overpass-api.de/api'

export class OverpassClient {
  async fetchElements(city: string, adminLevel: number) {
    const query = this.buildQuery(city, adminLevel)
    const data = await this.executeQuery(query)

    return data.elements
  }

  private async executeQuery(query: string) {
    const response = await fetch(`${API_URL}/interpreter`, {
      method: 'POST',
      body: query,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    const data = await response.json()

    return OverpassResponse.parse(data)
  }

  private buildQuery(city: string, adminLevel: number): string {
    return `
  [out:json];
  area["name"="${city}"]->.searchArea;
  (
    relation["admin_level"="${adminLevel}"](area.searchArea);
  );
  out body;
  >;
  out skel qt;
    `
  }
}
