'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/homepage/Hero';
import { ActivityCircles } from '@/components/homepage/ActivityCircles';
import { Marquee } from '@/components/homepage/Marquee';
import { BentoGrid } from '@/components/homepage/BentoGrid';
import { LiveFeed } from '@/components/homepage/LiveFeed';
import { CTASection } from '@/components/homepage/CTASection';
import { HomeBottomNav } from '@/components/homepage/HomeBottomNav';
import SOSButton from '@/components/shared/SOSButton';
import { Footer } from '@/components/layout/Footer';
import { useScrollY } from '@/hooks/useScrollY';

export default function HomePageClient() {
  const [mounted, setMounted] = useState(false);
  const scrollY = useScrollY();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div style={{ minHeight: '100dvh', background: 'var(--kh-bg)' }} />;
  }

  return (
    <div
      style={{
        background: 'var(--kh-bg)',
        color: 'var(--kh-text)',
        minHeight: '100dvh',
        transition: 'background 0.4s ease, color 0.4s ease',
      }}
    >
      <Header />
      <Hero scrollY={scrollY} />
      <ActivityCircles />
      <Marquee />
      <BentoGrid />
      <LiveFeed />
      <CTASection />
      <Footer />
      <HomeBottomNav />
      <SOSButton />
    </div>
  );
}
