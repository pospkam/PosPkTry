import { Metadata, Viewport } from 'next';
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

const BASE_URL = 'https://tourhab.ru';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'TourHab — помощник и планировщик путешествия по Камчатке',
    template: '%s | TourHab Камчатка',
  },
  description: 'TourHab помогает честно и безопасно спланировать поездку по Камчатке: маршруты, карта, AI-помощник Кузьмич, поддержка и реальные туры от проверенных операторов.',
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
    title: 'TourHab — помощник по Камчатке',
    description: 'Помощник, планировщик и безопасный проводник к реальным турам по Камчатке.',
    images: [
      {
        url: '/images/hero/hero-light.jpeg',
        width: 1200,
        height: 630,
        alt: 'Kamchatour — Туры на Камчатку',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TourHab — помощник по Камчатке',
    description: 'Помогаем спланировать маршрут и выйти на реальный тур без обманов и серых схем.',
    images: ['/images/hero/hero-light.jpeg'],
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
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  applicationName: 'KamchatourHub',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KamchatourHub',
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
import MicrosoftClarity from '@/components/shared/MicrosoftClarity'
import StickyLeadButton from '@/components/shared/StickyLeadButton'
import KuzmichWidget from '@/components/kuzmich/KuzmichWidget'
import { InstallPrompt } from '@/components/PWA/InstallPrompt'
import { ServiceWorkerRegistrar } from '@/components/PWA/ServiceWorkerRegistrar'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="//mc.yandex.ru" />
        <link rel="dns-prefetch" href="//www.clarity.ms" />
        <link rel="dns-prefetch" href="//emrldco.com" />
        <link rel="dns-prefetch" href="//tile.opentopomap.org" />
        <link rel="preconnect" href="https://mc.yandex.ru" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.clarity.ms" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tile.opentopomap.org" crossOrigin="anonymous" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0f172a" />
      </head>
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
                "name": "TourHab — помощник по Камчатке",
                "url": "https://tourhab.ru",
                "description": "Сервис планирования путешествий по Камчатке: маршруты, карта, безопасность, AI-помощник и реальные туры от проверенных операторов.",
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
                "description": "Помощник, планировщик и путеводитель по Камчатке с доступом к реальным турам проверенных операторов.",
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
                "speakable": {
                  "@type": "SpeakableSpecification",
                  "cssSelector": ["h1", "h2", ".ds-h1", ".ds-h2", "article p:first-of-type", "[data-speakable]"]
                },
                "knowsAbout": [
                  "туры на Камчатку",
                  "вулканы Камчатки",
                  "рыбалка на Камчатке",
                  "Долина гейзеров",
                  "горячие источники",
                  "медведи Курильского озера",
                  "Ключевская сопка",
                  "Халактырский пляж",
                  "экотуризм Камчатки"
                ],
                "sameAs": [
                  "https://t.me/kamchatourhub",
                  "https://vk.com/kamchatourhub"
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "@id": "https://tourhab.ru/#localbusiness",
                "name": "TourHab",
                "description": "Туристический сервис Камчатки: маршруты, планирование поездки, поддержка и честные предложения реальных туров.",
                "url": "https://tourhab.ru",
                "logo": "https://tourhab.ru/logo-kamchatka.svg",
                "telephone": "+7 (914) 782-22-22",
                "email": "info@tourhab.ru",
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
                "priceRange": "$$",
                "openingHoursSpecification": {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
                  "opens": "00:00",
                  "closes": "23:59"
                },
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
        <MicrosoftClarity />
        <TravelPayoutsDrive />
        <StickyLeadButton />
        <KuzmichWidget />
        <InstallPrompt />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}

