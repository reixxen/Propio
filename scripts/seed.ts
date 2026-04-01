import 'dotenv/config'
import { SourceType } from '@/generated/prisma/client'
import prisma from '@/lib/db'
import { OverpassClient } from '@/integration/osm/overpass.client'
import { OverpassAdapter } from '@/integration/osm/overpass.adapter'
import { districtService } from '@/services/district.service'

async function main() {
  console.log('🚀 Starting seed...')

  const sourceData = [
    { type: SourceType.AVITO, key: 'avito' },
    { type: SourceType.VK, key: 'mgn.kvartira' },
    { type: SourceType.VK, key: 'mgn.realty' },
  ]

  for (const source of sourceData) {
    await prisma.source.upsert({
      where: { type_key: { type: source.type, key: source.key } },
      update: {},
      create: source,
    })
  }
  console.log(`✅ Sources initialized`)

  const overpassClient = new OverpassClient()
  const overpassAdapter = new OverpassAdapter(overpassClient)

  const city = 'Магнитогорск'
  console.log(`📡 Fetching districts for ${city} from Overpass...`)

  try {
    const districts = await overpassAdapter.getDistricts(city, 9)
    console.log(`📦 Found ${districts.length} districts. Saving to DB...`)

    const createdDistricts = await districtService.upsertDistricts(districts)
    console.log(`✅ ${createdDistricts.length} districts successfully mapped`)
  } catch (error) {
    console.error('❌ Failed to fetch districts:', error)
  }

  console.log('🏁 Seed finished successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
