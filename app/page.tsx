import type { Metadata } from 'next'

import HomePageClient from './_HomePageClient'

export const metadata: Metadata = {
  title: 'Kamchatour Hub — Туры на Камчатку | Рыбалка, вулканы, экология',
  description: 'Единая платформа туризма Камчатки. 6 ролей пользователей, AI-помощник, SOS с геолокацией, eco-points, реальные гиды и операторы.',
  keywords: 'туры Камчатка, рыбалка Камчатка, вулканы, горячие источники, гиды Камчатка, безопасный туризм',
  openGraph: {
    title: 'Kamchatour Hub — Туры на Камчатку',
    description: 'Рыбалка на чавычу, восхождения на вулканы, термальные источники. Бронирование онлайн с гарантией безопасности.',
    images: [
      {
        url: '/images/hero/hero-light.jpg',
        width: 1200,
        height: 630,
        alt: 'Камчатка — туры и приключения',
      },
    ],
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Kamchatour Hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kamchatour Hub — Туры на Камчатку',
    images: ['/images/dark.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
}

export default function Page() {
  return <HomePageClient />
}
