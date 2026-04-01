import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  doublePrecision,
  timestamp,
  unique,
  index,
  customType,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// PostGIS types
// ---------------------------------------------------------------------------

/**
 * geography(Point) - для хранения координат локации.
 * Расстояния через ST_DWithin считаются в метрах без проекций.
 */
const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType: () => 'geography(Point, 4326)',
})

/**
 * geometry(Geometry) - для полигонов районов.
 * Supports both Polygon и MultiPolygon из OSM.
 * ST_Contains / ST_Within работают корректно с этим типом.
 */
const geometryPolygon = customType<{ data: string; driverData: string }>({
  dataType: () => 'geometry(Geometry, 4326)',
})

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const sourceTypeEnum = pgEnum('source_type', ['AVITO', 'VK'])

export const propertyStatusEnum = pgEnum('property_status', [
  'ACTIVE',
  'INACTIVE',
])

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    type: sourceTypeEnum('type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique('sources_type_key_unique').on(t.type, t.key)]
)

// ---------------------------------------------------------------------------
// District
// ---------------------------------------------------------------------------
//
// Район хранит полигон как PostGIS geometry - это позволяет:
//   1. Определять район точки через ST_Contains прямо в БД (убирает turf.js)
//   2. Считать расстояния, строить буферы, пересечения — без кода в приложении
//
// center убран: вычисляется как ST_Centroid(geometry) когда нужно.
// id - OSM relation id ("relation/15592592"), внешний стабильный ключ.
// ---------------------------------------------------------------------------

export const districts = pgTable(
  'districts',
  {
    id: text('id').primaryKey(), // OSM relation id
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    city: text('city').notNull(),
    geometry: geometryPolygon('geometry').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique('districts_city_slug_unique').on(t.city, t.slug),
    index('districts_city_idx').on(t.city),
    // GIST индекс для ST_Contains - создаётся в миграции (см. ниже)
  ]
)

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------
//
// Дедупликация - исключительно через ST_DWithin(point, $point, 15).
// fullAddress НЕ unique — разные геокодеры/формулировки для одного места
// дают разные строки, полагаться на них нельзя.
//
// lon/lat хранятся отдельно для лёгкого чтения в приложении без PostGIS-функций.
// point - geography для пространственного поиска (метры без проекций).
// ---------------------------------------------------------------------------

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    districtId: text('district_id').references(() => districts.id, {
      onDelete: 'set null',
    }),

    city: text('city').notNull(),

    /// Короткий адрес: "улица Ленина, 93" - для отображения
    address: text('address').notNull(),

    /// Полный адрес от геокодера - для отображения и отладки, не для дедупликации
    fullAddress: text('full_address').notNull(),

    /// Координаты для чтения на уровне приложения (карта, фронтенд)
    lon: doublePrecision('lon').notNull(),
    lat: doublePrecision('lat').notNull(),

    /// PostGIS point - единственный ключ дедупликации через ST_DWithin
    point: geographyPoint('point').notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('locations_city_idx').on(t.city),
    // GIST индекс - в миграции
  ]
)

// ---------------------------------------------------------------------------
// Property
// ---------------------------------------------------------------------------
//
// Агрегирует объявления из разных источников для одного физического объекта.
// Матчинг объявлений - в ListingService (fuzzy score по полям + описание).
// ---------------------------------------------------------------------------

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: propertyStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),

    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id),

    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id),

    externalId: text('external_id').notNull(),
    externalUrl: text('external_url').notNull(),

    description: text('description').notNull(),
    images: text('images')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    postedAt: timestamp('posted_at').notNull(),

    /// Арендная плата, руб/мес
    rent: integer('rent').notNull(),
    /// null = не указан
    deposit: integer('deposit'),
    /// null = не указана
    commission: integer('commission'),

    /// null = не указана фиксированная сумма
    utilityAmount: integer('utility_amount'),
    /// true = ЖКУ включены в аренду
    utilityIncluded: boolean('utility_included'),
    /// true = арендатор платит по счётчикам
    utilityCounters: boolean('utility_counters'),

    rooms: integer('rooms'),
    area: doublePrecision('area'),
    floor: integer('floor'),
    totalFloors: integer('total_floors'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique('listings_source_external_unique').on(t.sourceId, t.externalId),
    index('listings_property_id_idx').on(t.propertyId),
    index('listings_location_id_idx').on(t.locationId),
    index('listings_posted_at_idx').on(t.postedAt),
  ]
)
