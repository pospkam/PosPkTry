'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/homepage/HeroSection';
import { CategoryCards } from '@/components/homepage/CategoryCards';
import { FeaturedTours } from '@/components/homepage/FeaturedTours';
import { PlatformStats } from '@/components/homepage/PlatformStats';
import { AudienceSection } from '@/components/homepage/AudienceSection';
import { ReviewsSection } from '@/components/homepage/ReviewsSection';
import { CTABanner } from '@/components/homepage/CTABanner';
import { HomeBottomNav } from '@/components/homepage/HomeBottomNav';
import SOSButton from '@/components/shared/SOSButton';
import { Footer } from '@/components/layout/Footer';

export default function HomePageClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="min-h-[100dvh] bg-[var(--kh-bg)]" />;
  }

  return (
    <div className="bg-[var(--kh-bg)] text-[var(--kh-text)] min-h-[100dvh] transition-colors duration-300">
      <Header />
      <main>
        <HeroSection />
        <CategoryCards />
        <FeaturedTours />
        <PlatformStats />
        <AudienceSection />
        <ReviewsSection />
        <CTABanner />
      </main>
      <Footer />
      <HomeBottomNav />
      <SOSButton />
    </div>
  );
}
