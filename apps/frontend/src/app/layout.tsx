import type { Metadata } from 'next'
import { Geist_Mono, Inter_Tight } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'
import { Providers } from './providers'

const interTight = Inter_Tight({ variable: '--font-inter-tight', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = { title: 'Judite' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${interTight.variable} ${geistMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
