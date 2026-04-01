'use client'

import { Badge } from '@/components/ui/badge'
import { useSuspenseProperty } from '../hooks/use-properties'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ArrowLeft, ExternalLink, MapPin, Building2, Clock } from 'lucide-react'
import React from 'react'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)

const formatRooms = (rooms: number | null) => {
  if (rooms == null) return 'Квартира'
  return rooms === 0 ? 'Студия' : `${rooms}-к. квартира`
}

const formatArea = (area: number | null) => {
  if (area == null) return ''
  return `${area} м²`
}

const formatFloor = (floor: number | null, totalFloors: number | null) => {
  if (floor == null) return ''
  return totalFloors != null ? `${floor}/${totalFloors} этаж` : `${floor} этаж`
}

export const PropertyView = ({ id }: { id: string }) => {
  const { data: property } = useSuspenseProperty(id)

  return (
    <div className="space-y-8">
      <Link
        href="/properties"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Назад к списку
      </Link>

      {/* Summary */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Images */}
        <div className="relative aspect-4/3 overflow-hidden rounded-xl">
          <Image
            src={property.images[0]!}
            alt={property.location?.address ?? ''}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold tracking-tight">
            {[
              formatRooms(property.rooms),
              formatArea(property.area),
              formatFloor(property.floor, property.totalFloors),
            ]
              .filter(Boolean)
              .map((part, index) => (
                <React.Fragment key={index}>
                  {part && index > 0 ? <>&nbsp;</> : ''}
                  {part}
                </React.Fragment>
              ))}
          </h1>

          {property.rent != null && (
            <p className="text-2xl font-bold">
              {formatPrice(property.rent)}
              <span className="text-base font-normal text-muted-foreground">
                {' '}
                / мес.
              </span>
            </p>
          )}

          {/* Price details */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {property.deposit != null && (
              <>
                <dt className="text-muted-foreground">Залог</dt>
                <dd>{formatPrice(property.deposit)}</dd>
              </>
            )}
            {property.commission != null && (
              <>
                <dt className="text-muted-foreground">Комиссия</dt>
                <dd>{formatPrice(property.commission)}</dd>
              </>
            )}
            {property.utilityIncluded != null && (
              <>
                <dt className="text-muted-foreground">ЖКУ</dt>
                <dd>
                  {property.utilityIncluded
                    ? 'Включены в стоимость'
                    : property.utilityAmount != null
                      ? formatPrice(property.utilityAmount)
                      : 'Не включены'}
                </dd>
              </>
            )}
            {property.utilityCounters != null && (
              <>
                <dt className="text-muted-foreground">Счётчики</dt>
                <dd>
                  {property.utilityCounters
                    ? 'Оплачивает арендатор'
                    : 'Оплачивает владелец'}
                </dd>
              </>
            )}
          </dl>

          {/* Location */}
          {property.location && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span>{property.location.fullAddress}</span>
              </div>
              {property.location.district && (
                <Badge variant="outline" className="text-xs">
                  {property.location.district.name}
                </Badge>
              )}
            </div>
          )}

          {/* Sources */}
          <div className="flex flex-wrap gap-2">
            {property.listings.map((listing) => (
              <a
                key={listing.id}
                href={listing.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <ExternalLink className="size-3.5" />
                {listing.source.key}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Описание</h2>
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {property.listings[0]!.description}
        </p>
      </section>

      {/* Listing history */}
      {property.listings.length > 1 && (
        <section className="h-[5000px]">
          <h2 className="text-lg font-semibold">
            История объявлений ({property.listings.length})
          </h2>

          {property.listings.map((listing) => (
            <div
              key={listing.id}
              className="relative flex scroll-mt-18 justify-end gap-2"
            >
              <div className="sticky top-19 flex w-48 flex-col items-end gap-2 self-start pb-4 max-md:hidden">
                <Badge className="flex size-6 w-auto justify-end rounded-sm text-sm font-medium">
                  {listing.source.key}
                </Badge>
                <div className="text-muted-foreground text-right text-sm font-medium">
                  {format(listing.postedAt, 'd MMMM yyyy, HH:mm', {
                    locale: ru,
                  })}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="sticky top-19 flex size-6 items-center justify-center max-sm:top-5">
                  <span className="bg-primary/20 flex size-4.5 shrink-0 items-center justify-center rounded-full">
                    <span className="bg-primary size-3 rounded-full" />
                  </span>
                </div>
                <span className="-mt-2.5 w-px flex-1 border" />
              </div>

              <div className="flex flex-1 flex-col gap-4 pb-11 pl-3 md:pl-6 lg:pl-9">
                <div className="flex flex-col gap-2 md:hidden">
                  <Badge className="flex rounded-sm font-medium">
                    {listing.source.key}
                  </Badge>
                  <div className="font-medium">
                    {format(listing.postedAt, 'd MMMM yyyy, HH:mm', {
                      locale: ru,
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-foreground">
                      {formatPrice(listing.rent)}{' '}
                      <span className="text-sm font-normal">/ мес.</span>
                    </span>
                    {listing.deposit != null && (
                      <span className="text-xs text-muted-foreground">
                        Залог: {formatPrice(listing.deposit)}
                      </span>
                    )}
                  </div>

                  <a
                    href={listing.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Оригинал
                  </a>

                  <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
                    {listing.description}
                  </p>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {listing.images.slice(0, 6).map((src, i) => (
                      <div
                        key={i}
                        className="relative size-20 shrink-0 overflow-hidden rounded-md"
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {listing.images.length > 6 && (
                      <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                        +{listing.images.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

type ListingData = ReturnType<
  typeof useSuspenseProperty
>['data']['listings'][number]

const ListingEntry = ({
  listing,
  baseRent,
}: {
  listing: ListingData
  baseRent: number | null
}) => {
  const rentDiffers = baseRent != null && listing.rent !== baseRent

  return (
    <article className="relative space-y-3">
      <div className="absolute -left-6 top-1 flex size-4 items-center justify-center rounded-full border bg-background">
        <div className="size-1.5 rounded-full bg-foreground" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{listing.source.key}</Badge>

        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {format(listing.postedAt, 'd MMMM yyyy, HH:mm', { locale: ru })}
        </span>

        <a
          href={listing.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3" />
          Открыть
        </a>
      </div>

      {/* Show differing details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          {formatPrice(listing.rent)} / мес.
          {rentDiffers && (
            <span className="ml-1 text-xs text-muted-foreground">
              (отличается)
            </span>
          )}
        </span>

        {listing.rooms != null && <span>{formatRooms(listing.rooms)}</span>}

        {listing.area != null && <span>{listing.area} м²</span>}

        {listing.floor != null && (
          <span>
            {listing.totalFloors != null
              ? `${listing.floor}/${listing.totalFloors} эт.`
              : `${listing.floor} эт.`}
          </span>
        )}
      </div>

      {listing.location.address && (
        <p className="text-xs text-muted-foreground">
          {listing.location.fullAddress}
        </p>
      )}

      {listing.description && (
        <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
          {listing.description}
        </p>
      )}

      {listing.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {listing.images.slice(0, 6).map((src, i) => (
            <div
              key={i}
              className="relative size-20 shrink-0 overflow-hidden rounded-md"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          ))}
          {listing.images.length > 6 && (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              +{listing.images.length - 6}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
