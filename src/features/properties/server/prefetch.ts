import { prefetch, trpc } from '@/trpc/server'
import { inferInput } from '@trpc/tanstack-react-query'

type Input = inferInput<typeof trpc.properties.findMany>

export const prefetchProperties = async (params: Input) => {
  return prefetch(trpc.properties.findMany.queryOptions(params))
}

export const prefetchProperty = async (id: string) => {
  return prefetch(trpc.properties.findUnique.queryOptions({ id }))
}
