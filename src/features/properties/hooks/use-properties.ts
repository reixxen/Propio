import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query'

export const useSuspenseProperties = () => {
  const trpc = useTRPC()

  return useSuspenseQuery(trpc.properties.findMany.queryOptions())
}

export const useSuspenseProperty = (id: string) => {
  const trpc = useTRPC()

  return useSuspenseQuery(trpc.properties.findUnique.queryOptions({ id }))
}
