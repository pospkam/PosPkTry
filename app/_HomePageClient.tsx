'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/homepage/HeroSection';
import { TripPlanner } from '@/components/homepage/TripPlanner';
import { CategoryCards } from '@/components/homepage/CategoryCards';
import { NowOnKamchatka } from '@/components/homepage/NowOnKamchatka';
import { PlatformStats } from '@/components/homepage/PlatformStats';
import { ReviewsSection } from '@/components/homepage/ReviewsSection';
import { SafetyAlertBanner } from '@/components/homepage/SafetyAlertBanner';
import { HomeBottomNav } from '@/components/homepage/HomeBottomNav';
import SOSButton from '@/components/shared/SOSButton';
import { AssistantButton } from '@/components/shared/AssistantButton';
import { Footer } from '@/components/layout/Footer';
import { useSourceTracker } from '@/hooks/useSourceTracker';

export default function HomePageClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useSourceTracker();

  if (!mounted) {
    return <div className="min-h-[100dvh] bg-[var(--kh-bg)]" />;
  }

  return (
    <div className="bg-[var(--kh-bg)] text-[var(--kh-text)] min-h-[100dvh] transition-colors duration-300">
      <Header />
      <SafetyAlertBanner />
      <main>
        <HeroSection />
        <NowOnKamchatka />
        <CategoryCards />
        <TripPlanner />
        <PlatformStats />
        <ReviewsSection />
      </main>
      <Footer />
      <HomeBottomNav />
      <SOSButton />
      <AssistantButton pageContext={{ type: 'home' }} />
    </div>
  );
}
