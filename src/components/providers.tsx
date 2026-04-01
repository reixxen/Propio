'use client'

import { TRPCReactProvider } from '@/trpc/client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <TRPCReactProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </TRPCReactProvider>
  )
}
