import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { HeroBoard } from '@/components/homepage/HeroBoard'
import { HomeMapPreview } from '@/components/homepage/HomeMapPreview'
import { MessengerAgentsSection } from '@/components/homepage/MessengerAgentsSection'
import { TrustSection } from '@/components/homepage/TrustSection'
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
        {/* Two columns: left=Hero(top)+AI(bottom), right=Map(full height) */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-10 px-4">
          <div className="flex flex-col gap-4">
            <HeroBoard />
            <MessengerAgentsSection />
          </div>
          <div className="h-full min-h-[500px]">
            <HomeMapPreview />
          </div>
        </div>

        {/* Почему TourHab — 4 преимущества */}
        <div className="max-w-7xl mx-auto px-4 mt-12 mb-8">
          <h2 className="text-center font-playfair text-xl font-bold mb-6">Почему TourHab</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-sm font-semibold">AI-планировщик</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Подберёт маршрут по вашим интересам за минуты</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center">
              <div className="text-2xl mb-2">🗺️</div>
              <p className="text-sm font-semibold">Живая карта</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">260 маршрутов с реальными координатами</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm font-semibold">Проверенные</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Только операторы с реальными отзывами</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <p className="text-sm font-semibold">Безопасность</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">SOS, погода, актуальные предупреждения</p>
            </div>
          </div>
        </div>

      </main>
      <Footer />
      <div className="md:hidden">
        <HomeBottomNav />
      </div>
      <SOSButton />
    </div>
  );
}
