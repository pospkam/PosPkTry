'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import { DesktopHero } from '@/components/home/DesktopHero';
import {
  HomeHeader,
  HomeSearchBar,
  CategoryChips,
  TourCardsRow,
  HomeBottomNav,
} from '@/components/home';

import { ModernTourSearch } from '@/components/ModernTourSearch';

export default function HomePageClient() {
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  return (
    <div className="min-h-screen w-full relative bg-[#0D1117] lg:max-w-none lg:mx-0">

      {/* Hero */}
      {isDesktop ? (
        <DesktopHero />
      ) : (
        <div className="relative h-[32vh] min-h-[240px] max-h-[360px] w-full overflow-hidden bg-gradient-to-br from-[#0D1117] via-[#1a0a00] to-[#0D1117] hero-stars">
          <HomeHeader />
        </div>
      )}

      {/* Поисковая строка */}
      <div className="relative px-4 lg:px-8 -mt-6 lg:mt-0 z-20">
        <HomeSearchBar />
      </div>

      {/* Контент */}
      <main className="relative px-4 lg:px-0 pt-4 pb-28 lg:pb-0">
        <CategoryChips />

        <Suspense fallback={<Loader2 className="animate-spin text-[var(--text-muted)]" />}>
          <ModernTourSearch />
        </Suspense>

        <TourCardsRow />
      </main>

      {!isDesktop && <HomeBottomNav />}
    </div>
  );
}
