import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { HeroBoard } from '@/components/homepage/HeroBoard'
import { HomeMapPreview } from '@/components/homepage/HomeMapPreview'
import { MessengerAgentsSection } from '@/components/homepage/MessengerAgentsSection'
import { Footer } from '@/components/layout/Footer'

const HomeBottomNav = dynamic(
  () => import('@/components/homepage/HomeBottomNav').then(m => ({ default: m.HomeBottomNav }))
);
const SOSButton = dynamic(() => import('@/components/shared/SOSButton'));

export const metadata: Metadata = {
  title: 'TourHab — помощник и планировщик путешествия по Камчатке',
  description: 'TourHab помогает спланировать честное и безопасное путешествие по Камчатке.',
  openGraph: {
    title: 'TourHab — Туры на Камчатку',
    description: 'Маршруты, советы, Кузьмич, проверенные операторы.',
    images: [{ url: '/images/hero/hero-light.jpeg', width: 1200, height: 630, alt: 'Камчатка' }],
    type: 'website', locale: 'ru_RU', siteName: 'TourHab',
  },
  twitter: { card: 'summary_large_image', title: 'TourHab', images: ['/images/hero/hero-light.jpeg'] },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

function SectionSkeleton() {
  return <div className="py-20 px-5"><div className="max-w-6xl mx-auto h-64 bg-[var(--bg-hover)] rounded-lg ds-skeleton" /></div>;
}

export default async function Page() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh] flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Two vertical columns: left split horizontal, right = map */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
          {/* Left column: split horizontal (hero top, AI bottom) */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="flex-1 min-h-[200px]">
              <HeroBoard />
            </div>
            <div className="flex-1 min-h-[200px]">
              <MessengerAgentsSection />
            </div>
          </div>
          {/* Right column: full-height map */}
          <div className="w-full lg:w-1/2">
            <HomeMapPreview />
          </div>
        </div>

      </main>
      <Footer />
      <HomeBottomNav />
      <SOSButton />
    </div>
  );
}
