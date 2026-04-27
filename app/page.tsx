import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { HeroBoard } from '@/components/homepage/HeroBoard'
import { HomeMapPreview } from '@/components/homepage/HomeMapPreview'
import { MessengerAgentsSection } from '@/components/homepage/MessengerAgentsSection'
import { TrustSection } from '@/components/homepage/TrustSection'
import { Footer } from '@/components/layout/Footer'
import { OnSiteBanner } from '@/components/geo/OnSiteBanner'

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
      <OnSiteBanner />
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
            <div className="group p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent)]/10 hover:-translate-y-1">
              <svg className="w-8 h-8 mx-auto mb-2 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              <p className="text-sm font-semibold">AI-планировщик</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Подберёт маршрут по вашим интересам за минуты</p>
            </div>
            <div className="group p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent)]/10 hover:-translate-y-1">
              <svg className="w-8 h-8 mx-auto mb-2 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              <p className="text-sm font-semibold">Живая карта</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">260 маршрутов с реальными координатами</p>
            </div>
            <div className="group p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent)]/10 hover:-translate-y-1">
              <svg className="w-8 h-8 mx-auto mb-2 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              <p className="text-sm font-semibold">Проверенные</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Только операторы с реальными отзывами</p>
            </div>
            <div className="group p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent)]/10 hover:-translate-y-1">
              <svg className="w-8 h-8 mx-auto mb-2 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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
