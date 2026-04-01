import osmtogeojson from 'osmtogeojson'
import centroid from '@turf/centroid'
import { OverpassClient } from './overpass.client'
import { Feature, MultiPolygon, Polygon } from 'geojson'
import { District } from '@/models/district'
import { slugify } from 'transliteration'

export class OverpassAdapter {
  constructor(private readonly client: OverpassClient) {}

  async getDistricts(city: string, adminLevel: number): Promise<District[]> {
    const elements = await this.client.fetchElements(city, adminLevel)
    const geojson = osmtogeojson({ elements })

    const districts: District[] = []

    for (const feature of geojson.features) {
      const isPolygon =
        feature.geometry.type === 'Polygon' ||
        feature.geometry.type === 'MultiPolygon'

      if (!isPolygon || !feature.properties?.name) {
        continue
      }

      const district = District.parse(this.mapFeatureToDistrict(feature, city))

      districts.push(district)
    }

    return districts
  }

  private mapFeatureToDistrict(feature: Feature, city: string): District {
    const cleanName = this.cleanDistrictName(feature.properties?.name ?? '')
    const slug = slugify(cleanName)
    const centerPoint = centroid(feature)

    return {
      id: String(feature.id),
      city: city,
      name: cleanName,
      slug: slug,
      center: centerPoint.geometry.coordinates,
      geometry: feature.geometry as Polygon | MultiPolygon,
    }
  }

  private cleanDistrictName(name: string): string {
    return name
      .replace(/\s*район\s*/gi, '')
      .replace(/\s*городской округ\s*/gi, '')
      .trim()
  }
}
