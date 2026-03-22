import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Providers } from '@/app/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'KWHU MVP',
  description:
    'Wallet-first KWHU marketplace on Base with a foundation vault, controlled token flows, and escrowed settlement.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
