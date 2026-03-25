'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

const HERO_LIGHT = '/images/hero/hero-light.jpeg';
const HERO_DARK  = '/images/hero/hero-dark.jpeg';

export function HeroCompact() {
  return (
    <section className="relative h-[50svh] min-h-[360px] flex flex-col items-center justify-center overflow-hidden">
      <Image
        src={HERO_LIGHT}
        alt="Камчатка"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center dark:opacity-0 transition-opacity duration-700"
      />
      <Image
        src={HERO_DARK}
        alt="Камчатка"
        fill
        sizes="100vw"
        className="object-cover object-center opacity-0 dark:opacity-100 transition-opacity duration-700"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

      <div className="relative z-10 flex flex-col items-center text-center px-5 max-w-3xl">
        <p className="text-[10px] font-medium uppercase tracking-[6px] text-[rgba(255,255,255,0.55)] mb-6">
          52°N · Камчатка · Россия
        </p>

        <h1
          className="font-playfair text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.05] mb-4"
          style={{ textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}
        >
          Камчатка
          <br />
          <span className="text-[var(--accent)] [text-shadow:0_4px_32px_rgba(212,74,12,0.35)]">
            ждёт тебя
          </span>
        </h1>

        <p
          className="text-[rgba(255,255,255,0.85)] text-sm md:text-base mb-6 max-w-md leading-relaxed font-light"
          style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}
        >
          Спроси Кузьмича — AI подберёт маршрут за минуту
        </p>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <ChevronDown className="w-5 h-5 text-[rgba(255,255,255,0.5)]" />
      </div>
    </section>
  );
}
