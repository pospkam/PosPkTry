import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { HeroBoard } from '@/components/homepage/HeroBoard'
import { MessengerAgentsSection } from '@/components/homepage/MessengerAgentsSection'
import { DirectionsList } from '@/components/homepage/DirectionsList'
import { Footer } from '@/components/layout/Footer'

// Lazy-loaded client sections (below fold)
const BoardStatusLive = dynamic(
  () => import('@/components/homepage/BoardStatusLive').then(m => ({ default: m.BoardStatusLive })),
  { loading: () => <SectionSkeleton /> }
);
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
  title: 'Туры на Камчатку 2026 — бронирование онлайн | TourHab',
  description: 'Туры на Камчатку: рыбалка на лосося, восхождения на вулканы, горячие источники, медведи. Бронируйте у проверенных операторов онлайн.',
  keywords: 'туры Камчатка, рыбалка Камчатка, вулканы, горячие источники, гиды Камчатка, безопасный туризм',
  openGraph: {
    title: 'Туры на Камчатку 2026 — бронирование онлайн | TourHab',
    description: 'Рыбалка на лосося, восхождения на вулканы, термальные источники, медведи. Бронируйте у местных операторов онлайн.',
    images: [
      {
        url: '/images/hero/hero-light.jpeg',
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
    images: ['/images/hero/hero-light.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
}

// Server-side: ecosystem stats cached 5 min (kept for future use when traffic grows)
// const getEcosystemStats = unstable_cache(...)

function SectionSkeleton() {
  return <div className="py-20 px-5"><div className="max-w-6xl mx-auto h-64 bg-[var(--bg-hover)] rounded-lg ds-skeleton" /></div>;
}

function ChatSkeleton() {
  return (
    <section className="py-16 px-5">
      <div className="max-w-2xl mx-auto">
        <div className="h-8 w-48 mx-auto bg-[var(--bg-hover)] rounded ds-skeleton mb-4" />
        <div className="h-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg ds-skeleton" />
      </div>
    </section>
  );
}

export default async function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'Kamchatour Hub',
    url: 'https://tourhab.ru',
    description: 'Туристическая платформа Камчатки с туром рыболовство, вулканы и природные чудеса',
    telephone: '+7 (4152) 29-99-99',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Петропавловск-Камчатский',
      addressCountry: 'RU',
    },
    areaServed: 'Камчатский край',
    sameAs: ['https://tourhab.ru'],
  };

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <HeroBoard />
        <MessengerAgentsSection />
        <DirectionsList />
        <BoardStatusLive />
        <InlineChat />
        <TrustSection />
      </main>
      <Footer />
      <HomeBottomNav />
      <SOSButton />
    </div>
  );
}
