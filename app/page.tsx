import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { HeroCompact } from '@/components/homepage/HeroCompact'
import { Footer } from '@/components/layout/Footer'

// Lazy-loaded client sections (below fold)
const InlineChat = dynamic(() => import('@/components/homepage/InlineChat'), {
  loading: () => <ChatSkeleton />,
});
const FeaturedDirections = dynamic(
  () => import('@/components/homepage/FeaturedDirections').then(m => ({ default: m.FeaturedDirections })),
  { loading: () => <SectionSkeleton /> }
);
const TrustSection = dynamic(
  () => import('@/components/homepage/TrustSection').then(m => ({ default: m.TrustSection })),
  { loading: () => <SectionSkeleton /> }
);
const LeadCTASection = dynamic(
  () => import('@/components/homepage/LeadCTASection').then(m => ({ default: m.LeadCTASection })),
  { loading: () => <SectionSkeleton /> }
);
const HomeBottomNav = dynamic(
  () => import('@/components/homepage/HomeBottomNav').then(m => ({ default: m.HomeBottomNav }))
);
const SOSButton = dynamic(() => import('@/components/shared/SOSButton'));

export const metadata: Metadata = {
  title: 'Kamchatour Hub — Туры на Камчатку | Рыбалка, вулканы, экология',
  description: 'Единая платформа туризма Камчатки. 6 ролей пользователей, AI-помощник, SOS с геолокацией, eco-points, реальные гиды и операторы.',
  keywords: 'туры Камчатка, рыбалка Камчатка, вулканы, горячие источники, гиды Камчатка, безопасный туризм',
  openGraph: {
    title: 'Kamchatour Hub — Туры на Камчатку',
    description: 'Рыбалка на чавычу, восхождения на вулканы, термальные источники. Бронирование онлайн с гарантией безопасности.',
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
        <HeroCompact />
        <InlineChat />
        <FeaturedDirections />
        <LeadCTASection />
        <TrustSection />
      </main>
      <Footer />
      <HomeBottomNav />
      <SOSButton />
    </div>
  );
}
