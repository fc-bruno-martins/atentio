'use client'

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, type ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { isPublicPath } from '@/lib/session-cookie'

function redirectIfSessionEnded(error: Error) {
  if (error instanceof ApiError && error.status === 401 && !isPublicPath(location.pathname)) {
    window.location.assign('/login')
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: redirectIfSessionEnded }),
        mutationCache: new MutationCache({ onError: redirectIfSessionEnded }),
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}
