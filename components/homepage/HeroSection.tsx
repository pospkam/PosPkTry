'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';

const HERO_LIGHT = '/images/hero/hero-light.jpeg';
const HERO_DARK  = '/images/hero/hero-dark.jpeg';

const CHIPS = [
  'Рыбалка на чавычу',
  'Подъём на вулкан',
  'Горячие источники',
  'Медведи Курильского',
];

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(text?: string) {
    const q = (text ?? query).trim();
    if (!q) return;
    router.push(`/ai-assistant?q=${encodeURIComponent(q)}`);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submit();
  }

  return (
    <section className="relative h-[100svh] min-h-[600px] flex flex-col overflow-hidden">

      {/* Фото — светлое/тёмное через CSS media */}
      <Image
        src={HERO_LIGHT}
        alt="Камчатка"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center dark:opacity-0 transition-opacity duration-500"
      />
      <Image
        src={HERO_DARK}
        alt="Камчатка"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-0 dark:opacity-100 transition-opacity duration-500"
      />

      {/* Градиент снизу и сверху */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

      {/* Координаты — верх */}
      <div className="relative z-10 p-6 md:p-10">
        <p className="text-[10px] font-medium uppercase tracking-[4px] text-[rgba(255,255,255,0.5)]">
          52°N · Камчатский полуостров · Россия
        </p>
      </div>

      {/* Основной контент — центр/низ */}
      <div className="relative z-10 mt-auto px-5 md:px-10 pb-16 md:pb-20 max-w-3xl">

        {/* Бейдж */}
        <div className="inline-flex items-center gap-2 bg-black/25 border border-[rgba(255,255,255,0.2)] rounded-full px-3 py-1 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-[11px] text-white font-medium tracking-wide">
            AI-помощник Кузьмич онлайн
          </span>
        </div>

        {/* Заголовок */}
        <h1
          className="font-playfair text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-4"
          style={{ textShadow: '0 2px 32px rgba(0,0,0,0.4)' }}
        >
          Дикая Камчатка.
          <br />
          <span className="text-[var(--accent)] [text-shadow:0_2px_24px_rgba(212,74,12,0.4)]">Ваш маршрут.</span>
        </h1>

        <p className="text-[rgba(255,255,255,0.75)] text-sm md:text-base mb-8 max-w-lg leading-relaxed">
          14 направлений, реальные гиды, SOS-безопасность.
          Спросите Кузьмича — он подберёт тур за 30 секунд.
        </p>

        {/* Поисковая строка Кузьмича */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#21262D] rounded-full px-4 py-3 shadow-2xl max-w-xl mb-4">
          <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Куда хочешь на Камчатку?"
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={!query.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center disabled:opacity-40 transition-opacity hover:opacity-90"
            aria-label="Найти"
          >
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Chips-подсказки */}
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => submit(chip)}
              className="text-[11px] text-[rgba(255,255,255,0.8)] border border-[rgba(255,255,255,0.25)] rounded-full px-3 py-1 hover:bg-[rgba(255,255,255,0.15)] hover:text-white transition-all"
            >
              {chip}
            </button>
          ))}
          <a
            href="/marketplace"
            className="text-[11px] text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.15)] rounded-full px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.8)] transition-all"
          >
            Все туры →
          </a>
        </div>
      </div>
    </section>
  );
}
