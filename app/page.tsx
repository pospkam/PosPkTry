import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { pool } from '@/lib/db-pool'
import { Header } from '@/components/layout/Header'
import { HeroCompact } from '@/components/homepage/HeroCompact'
import EcosystemPulse from '@/components/homepage/EcosystemPulse'
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
const HomeBottomNav = dynamic(
  () => import('@/components/homepage/HomeBottomNav').then(m => ({ default: m.HomeBottomNav }))
);
const SOSButton = dynamic(() => import('@/components/shared/SOSButton'));
const AssistantButton = dynamic(
  () => import('@/components/shared/AssistantButton').then(m => ({ default: m.AssistantButton }))
);

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

// Server-side: ecosystem stats for EcosystemPulse
async function getEcosystemStats() {
  try {
    const [chats, routes, agents] = await Promise.all([
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM chat_sessions WHERE updated_at > NOW() - INTERVAL '24 hours'`
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM agent_route_knowledge WHERE is_visible = true`
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT metadata->>'agent_id')::text AS count FROM ai_actions_log WHERE created_at > NOW() - INTERVAL '1 hour'`
      ),
    ]);
    return {
      chatsToday: parseInt(chats.rows[0]?.count ?? '0', 10),
      activeRoutes: parseInt(routes.rows[0]?.count ?? '0', 10),
      activeAgents: parseInt(agents.rows[0]?.count ?? '0', 10),
    };
  } catch {
    return { chatsToday: 0, activeRoutes: 0, activeAgents: 0 };
  }
}

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
  const stats = await getEcosystemStats();

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <Header />
      <main>
        <HeroCompact />
        <InlineChat />
        <EcosystemPulse stats={stats} />
        <FeaturedDirections />
        <TrustSection />
      </main>
      <Footer />
      <HomeBottomNav />
      <SOSButton />
      <AssistantButton pageContext={{ type: 'home' }} />
    </div>
  );
}
