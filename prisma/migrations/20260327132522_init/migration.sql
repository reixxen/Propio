-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('AVITO', 'VK');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "postedAt" TIMESTAMP(3),
    "rent" INTEGER,
    "deposit" INTEGER,
    "commission" INTEGER,
    "utilityAmount" INTEGER,
    "utilityIncluded" BOOLEAN,
    "utilityCounters" BOOLEAN,
    "rooms" INTEGER,
    "area" DOUBLE PRECISION,
    "floor" INTEGER,
    "totalFloors" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "districtId" TEXT,
    "fullAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "center" JSONB NOT NULL,
    "geometry" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_type_key_key" ON "Source"("type", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_sourceId_externalId_key" ON "Listing"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_fullAddress_key" ON "Location"("fullAddress");

-- CreateIndex
CREATE INDEX "Location_lon_lat_idx" ON "Location"("lon", "lat");

-- CreateIndex
CREATE INDEX "District_city_idx" ON "District"("city");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
