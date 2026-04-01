import { ModeToggle } from '@/components/mode-toggle'
import { PropertyView } from '@/features/properties/components/property-view'
import { prefetchProperty } from '@/features/properties/server/prefetch'
import { HydrateClient } from '@/trpc/server'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

const Page = async ({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) => {
  const { propertyId } = await params
  prefetchProperty(propertyId)

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Аренда квартир</h1>
        <ModeToggle />
      </header>

      <HydrateClient>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Suspense fallback={<div>Loading...</div>}>
            <PropertyView id={propertyId} />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </main>
  )
}

export default Page
