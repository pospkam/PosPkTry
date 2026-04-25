import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { HeroBoard } from '@/components/homepage/HeroBoard'
import { HomeMapPreview } from '@/components/homepage/HomeMapPreview'
import { Footer } from '@/components/layout/Footer'

const InlineChat = dynamic(() => import('@/components/homepage/InlineChat'), {
  loading: () => <ChatSkeleton />,
});
const TrustSection = dynamic(
  () => import('@/components/homepage/TrustSection').then(m => ({ default: m.TrustSection })),
  { loading: () => <SectionSkeleton /> }
);
const HomeBottomNav = dynamic(
  () => import('@/components/homepage/HomeBottomNav').then(m => ({ default: m.HomeBottomNav }))
);
const SOSButton = dynamic(() => import('@/components/shared/SOSButton'));

export const metadata: Metadata = {
  title: 'TourHab — помощник и планировщик путешествия по Камчатке',
  description: 'TourHab помогает спланировать честное и безопасное путешествие по Камчатке: маршруты, советы, Кузьмич, проверенные операторы и реальные туры без обманов.',
  keywords: 'туры Камчатка, рыбалка Камчатка, вулканы, горячие источники, гиды Камчатка, безопасный туризм',
  openGraph: {
    title: 'TourHab — помощник и планировщик путешествия по Камчатке',
    description: 'Помогаем выбрать маршрут, оценить риски и выйти на реальный тур у проверенного оператора без серых схем и пустых обещаний.',
    images: [
      { url: '/images/hero/hero-light.jpeg', width: 1200, height: 630, alt: 'Камчатка — туры и приключения' },
    ],
    type: 'website',
    locale: 'ru_RU',
    siteName: 'TourHab',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TourHab — Туры на Камчатку',
    images: ['/images/hero/hero-light.jpeg'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

function SectionSkeleton() {
  return <div className="py-20 px-5"><div className="max-w-6xl mx-auto h-64 bg-[var(--bg-hover)] rounded-lg ds-skeleton" /></div>;
}
function ChatSkeleton() {
  return (
    <section className="py-10 px-5">
      <div className="max-w-2xl mx-auto">
        <div className="h-6 w-40 mx-auto bg-[var(--bg-hover)] rounded ds-skeleton mb-3" />
        <div className="h-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg ds-skeleton" />
      </div>
    </section>
  );
}

export default async function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristInformationCenter',
    name: 'TourHab',
    url: 'https://tourhab.ru',
    description: 'Сервис планирования путешествий по Камчатке: маршруты, безопасность, AI-помощник и выход на реальные туры проверенных операторов',
    telephone: '+7 (4152) 29-99-99',
    address: { '@type': 'PostalAddress', streetAddress: 'Петропавловск-Камчатский', addressCountry: 'RU' },
    areaServed: 'Камчатский край',
    sameAs: ['https://tourhab.ru'],
  };

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main>
        {/* Two-column hero: left=Hero+AI, right=Map */}
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row">
            {/* Left: Hero + AI concierge */}
            <div className="w-full lg:w-[55%]">
              <HeroBoard />
              <InlineChat />
            </div>
            {/* Right: Map */}
            <div className="w-full lg:w-[45%]">
              <HomeMapPreview />
            </div>
          </div>
        </div>
        {/* Below: Trust / reviews */}
        <TrustSection />
      </main>
      <Footer />
      <HomeBottomNav />
      <SOSButton />
    </div>
  );
}
