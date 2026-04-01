'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSuspenseProperties } from '../hooks/use-properties'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ExternalLink, MapPin } from 'lucide-react'
import Link from 'next/link'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)

export const PropertyList = () => {
  const { data: properties } = useSuspenseProperties()

  if (properties.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Нет активных объявлений
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {properties.map((property) => (
        <li key={property.id}>
          <Link href={`/properties/${property.id}`}>
            <Card size="sm" className="pt-0!">
              <div className="relative aspect-4/3 overflow-hidden rounded-t-xl">
                <Image
                  src={property.images[0]!}
                  alt={property.location?.address ?? ''}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="object-cover"
                />

                <div className="absolute bottom-2 left-2 flex gap-1">
                  {property.sources.map((source) => (
                    <Badge
                      key={source.id}
                      className="border-0 bg-black/60 text-[10px] text-white backdrop-blur-sm"
                    >
                      {source.key}
                    </Badge>
                  ))}
                </div>
              </div>

              <CardHeader>
                <CardTitle>
                  <span>
                    {property.rooms != null
                      ? property.rooms === 0
                        ? 'Студия'
                        : `${property.rooms}-к. квартира`
                      : 'Квартира'}
                    {property.area != null && `, ${property.area} м²`}
                    {property.floor != null &&
                      (property.totalFloors != null
                        ? `, ${property.floor}/${property.totalFloors} эт.`
                        : `, ${property.floor} эт.`)}
                  </span>

                  {property.rent != null && (
                    <div className="text-base font-bold">
                      {formatPrice(property.rent)}
                      <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        / мес.
                      </span>
                    </div>
                  )}
                </CardTitle>

                <CardDescription className="flex flex-col gap-1">
                  {property.location?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {property.location.address}
                      </span>
                    </span>
                  )}

                  {property.location?.district && (
                    <Badge variant="outline" className="w-fit text-[10px]">
                      {property.location.district.name}
                    </Badge>
                  )}

                  {property.postedAt && (
                    <span className="text-xs text-muted-foreground/70">
                      {formatDistanceToNow(property.postedAt, {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>

              {property.sources.length > 0 && (
                <CardFooter className="mt-auto flex flex-wrap gap-2">
                  {property.sources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="size-3" />
                      {source.key}
                    </a>
                  ))}
                </CardFooter>
              )}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
