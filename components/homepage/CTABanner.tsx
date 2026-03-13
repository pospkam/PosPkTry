'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/homepage/Reveal';

export function CTABanner() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <Image
        src="/images/gallery/sunset-clouds.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="font-playfair text-3xl md:text-5xl font-bold text-white mb-4">
            Камчатка ждёт
          </h2>
        </Reveal>
        <Reveal delay={1}>
          <p className="text-white/70 text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Начните планировать путешествие или присоединитесь к платформе как партнёр
          </p>
        </Reveal>
        <Reveal delay={2}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tours"
              className="px-8 py-3 bg-[var(--kh-accent)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Найти тур
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3 border border-white/30 text-white text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Стать партнёром
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
