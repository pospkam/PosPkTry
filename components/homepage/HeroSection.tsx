'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

const HERO_LIGHT = '/images/hero/hero-light.jpeg';
const HERO_DARK  = '/images/hero/hero-dark.jpeg';

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function submit(text?: string) {
    const q = (text ?? query).trim();
    if (!q) return;
    router.push(`/ai-assistant?q=${encodeURIComponent(q)}`);
  }

  return (
    <section className="relative h-[100svh] min-h-[600px] flex flex-col items-center justify-center overflow-hidden">

      {/* Background images — light/dark */}
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
        priority
        sizes="100vw"
        className="object-cover object-center opacity-0 dark:opacity-100 transition-opacity duration-700"
      />

      {/* Gradient overlay — stronger in center for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center text-center px-5 max-w-3xl">

        {/* Coordinates */}
        <p className="text-[10px] font-medium uppercase tracking-[6px] text-[rgba(255,255,255,0.55)] mb-8">
          52°N · Камчатка · Россия
        </p>

        {/* Main headline */}
        <h1
          className="font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] mb-6"
          style={{ textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}
        >
          Камчатка
          <br />
          <span className="text-[var(--accent)] [text-shadow:0_4px_32px_rgba(212,74,12,0.35)]">
            ждёт тебя
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-[rgba(255,255,255,0.85)] text-base md:text-lg mb-10 max-w-md leading-relaxed font-light"
          style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}
        >
          AI-помощник подберёт маршрут за минуту.
          Вулканы, медведи, океан — всё настоящее.
        </p>

        {/* AI Search bar */}
        <div className="w-full max-w-xl mb-6">
          <div className="flex items-center gap-3 bg-[var(--bg-card)]/95 rounded-full px-5 py-3.5 shadow-2xl">
            <Sparkles className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Хочу 3 дня с рыбалкой и вулканами..."
              className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm md:text-base outline-none"
            />
            <button
              type="button"
              onClick={() => submit()}
              className="flex-shrink-0 px-5 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              disabled={!query.trim()}
            >
              Найти
            </button>
          </div>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {['Вулканы', 'Медведи', 'Рыбалка', 'Термы', 'Вертолёт'].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => submit(chip)}
              className="text-xs text-[rgba(255,255,255,0.85)] border border-[rgba(255,255,255,0.25)] rounded-full px-4 py-1.5 hover:bg-[rgba(255,255,255,0.15)] hover:text-white transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <ChevronDown className="w-5 h-5 text-[rgba(255,255,255,0.5)]" />
      </div>
    </section>
  );
}
