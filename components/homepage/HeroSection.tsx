'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { Reveal } from '@/components/homepage/Reveal';
import { SearchBar } from '@/components/homepage/SearchBar';
import { MapPin, ShieldCheck, Compass, AlertTriangle } from 'lucide-react';

const TRUST_ITEMS = [
  { icon: MapPin, value: '260+', label: 'маршрутов' },
  { icon: ShieldCheck, value: '50+', label: 'операторов' },
  { icon: Compass, value: '8', label: 'направлений' },
  { icon: AlertTriangle, value: '24/7', label: 'SOS' },
] as const;

export function HeroSection() {
  const { isDark } = useTheme();
  const heroSrc = isDark ? '/images/hero/hero-dark.jpg' : '/images/hero/hero-light.jpg';

  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <Image
        src={heroSrc}
        alt="Камчатка"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_30%]"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-[var(--kh-bg)]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-20 text-center">
        <Reveal>
          <p className="text-[10px] font-medium uppercase tracking-[3px] text-white/70 mb-4">
            55°N · Камчатский край
          </p>
        </Reveal>

        <Reveal delay={1}>
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-6xl font-bold text-white leading-tight mb-3 [text-shadow:_0_2px_16px_rgba(0,0,0,0.4)]">
            Камчатка — земля вулканов
            <br className="hidden sm:block" />
            {' '}и дикой природы
          </h1>
        </Reveal>

        <Reveal delay={2}>
          <p className="text-sm md:text-base text-white/70 mb-8 max-w-xl mx-auto">
            Откройте 260+ маршрутов от проверенных операторов
          </p>
        </Reveal>

        <Reveal delay={3}>
          <SearchBar />
        </Reveal>

        {/* Trust strip */}
        <Reveal delay={4}>
          <div className="mt-10 flex flex-wrap justify-center gap-6 md:gap-10">
            {TRUST_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                  <span className="text-xs text-white/60">{item.label}</span>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
