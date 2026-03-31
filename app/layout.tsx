import { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

const playfairDisplay = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-playfair',
});

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-outfit', // переменная сохранена для обратной совместимости
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tourhab.ru';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'TourHab — Туры на Камчатку | Вулканы, Рыбалка, Горячие источники, Места силы',
    template: '%s | TourHab Камчатка',
  },
  description: 'Туристическая платформа Камчатки: туры, маршруты, карта достопримечательностей. Вулканы, горячие источники, Долина гейзеров, рыбалка на лосося, места силы ительменов. Бронирование онлайн.',
  keywords: [
    'туры на Камчатку',
    'рыбалка Камчатка',
    'вулканы Камчатки',
    'Долина гейзеров',
    'горячие источники Камчатка',
    'Ключевская сопка',
    'Мутновский вулкан',
    'Курильское озеро',
    'Кальдера Узон',
    'отдых на Камчатке',
    'экскурсии Камчатка',
    'Халактырский пляж',
    'медведи Камчатка',
    'чавыча рыбалка',
    'кижуч нерка',
    'Петропавловск-Камчатский',
    'места силы Камчатка',
    'ительмены шаман',
    'Ксудач кальдера',
    'природные парки Камчатки',
    'Кроноцкий заповедник',
    'ЮНЕСКО вулканы',
    'экотуризм Камчатка',
    'helicopter tour Kamchatka',
    'Kamchatka volcano tour',
    'Kamchatka travel',
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
    other: {
      'travelpayouts-verification': '2aafzv6xt87m06rb',
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
}

import './globals.css'
import React from 'react'
import { Providers } from '@/components/Providers'
import YandexMetrika from '@/components/shared/YandexMetrika'
import TravelPayoutsDrive from '@/components/shared/TravelPayoutsDrive'
import StickyLeadButton from '@/components/shared/StickyLeadButton'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`min-h-screen transition-colors duration-300 ${inter.className} ${playfairDisplay.variable} ${inter.variable}`}>
        <Providers>
          {children}
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "TourHab — Туры на Камчатку",
                "url": "https://tourhab.ru",
                "description": "Туристическая платформа Камчатки: туры, маршруты, карта достопримечательностей. Вулканы, горячие источники, Долина гейзеров, рыбалка, места силы ительменов.",
                "inLanguage": "ru",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://tourhab.ru/routes?q={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@context": "https://schema.org",
                "@type": "TouristInformationCenter",
                "name": "TourHab",
                "description": "Маркетплейс туров и путеводитель по Камчатке.",
                "url": "https://tourhab.ru",
                "logo": "https://tourhab.ru/logo-kamchatka.svg",
                "address": {
                  "@type": "PostalAddress",
                  "addressCountry": "RU",
                  "addressRegion": "Камчатский край",
                  "addressLocality": "Петропавловск-Камчатский"
                },
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": 53.0444,
                  "longitude": 158.6483
                },
                "telephone": "+7 (914) 782-22-22",
                "sameAs": [
                  "https://t.me/kamchatourhub",
                  "https://vk.com/kamchatourhub"
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "ItemList",
                "name": "Топ достопримечательностей Камчатки",
                "description": "Главные природные и исторические объекты Камчатки",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Долина гейзеров", "url": "https://tourhab.ru/routes/796c18b3-e199-4ac6-bbd6-de50d560ff40" },
                  { "@type": "ListItem", "position": 2, "name": "Ключевская сопка", "url": "https://tourhab.ru/routes/54b106de-d81a-42af-9a41-32ee49604309" },
                  { "@type": "ListItem", "position": 3, "name": "Кальдера Узон", "url": "https://tourhab.ru/routes/a6330106-13d5-40f0-9c77-d252daf5b95f" },
                  { "@type": "ListItem", "position": 4, "name": "Курильское озеро — медведи", "url": "https://tourhab.ru/routes/8ef745b1-7de3-4899-9431-809f9c8521de" },
                  { "@type": "ListItem", "position": 5, "name": "Халактырский пляж", "url": "https://tourhab.ru/routes/49a1d46a-704b-4307-bb6a-fea5988ec4f8" },
                  { "@type": "ListItem", "position": 6, "name": "Вулкан Горелый", "url": "https://tourhab.ru/routes/430e1a7a-a1c2-4c5a-a8fd-866817f096ac" },
                  { "@type": "ListItem", "position": 7, "name": "Вулкан Мутновский", "url": "https://tourhab.ru/routes/acb8f5d3-9b44-48ec-9a81-1c8c71e451b9" },
                  { "@type": "ListItem", "position": 8, "name": "Плоский Толбачик", "url": "https://tourhab.ru/routes/fd0e39dc-36cc-4fa4-9be9-f0640b039fba" }
                ]
              }
            ])
          }}
        />
        <YandexMetrika />
        <TravelPayoutsDrive />
        <StickyLeadButton />
      </body>
    </html>
  )
}

