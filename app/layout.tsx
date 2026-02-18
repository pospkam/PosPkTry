import { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kamchatour.ru';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Kamchatour — Туры на Камчатку | Рыбалка, Вулканы, Природа',
    template: '%s | Kamchatour',
  },
  description: 'Туры на Камчатку: рыбалка на лосося, восхождения на вулканы, горячие источники, дикая природа. Бронирование онлайн, проверенные гиды.',
  keywords: [
    'туры на Камчатку',
    'рыбалка Камчатка',
    'вулканы Камчатки',
    'отдых на Камчатке',
    'экскурсии Камчатка',
    'горячие источники',
    'чавыча',
    'кижуч',
    'нерка',
    'Петропавловск-Камчатский',
  ],
  authors: [{ name: 'Kamchatour' }],
  creator: 'Kamchatour',
  publisher: 'Kamchatour',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: BASE_URL,
    siteName: 'Kamchatour',
    title: 'Kamchatour — Туры на Камчатку',
    description: 'Туры на Камчатку: рыбалка, вулканы, горячие источники. Бронирование онлайн.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Kamchatour — Туры на Камчатку',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kamchatour — Туры на Камчатку',
    description: 'Туры на Камчатку: рыбалка, вулканы, горячие источники. Бронирование онлайн.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
  },
  alternates: {
    canonical: BASE_URL,
  },
}

import './globals.css'
import React from 'react'
import { RoleProvider } from '@/contexts/RoleContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { OrdersProvider } from '@/contexts/OrdersContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen font-sans transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <RoleProvider>
              <OrdersProvider>
                {children}
              </OrdersProvider>
            </RoleProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

