'use client';

import Image from 'next/image';

const HERO_SRC = '/images/hero/bears-kurilskoye.jpg';

export function HeroSection() {
  return (
    <section className="relative h-[100svh] min-h-[580px] flex flex-col overflow-hidden">
      {/* Фотография на весь экран */}
      <Image
        src={HERO_SRC}
        alt="Курильское озеро — медведи, Камчатка"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Тонкий градиент только снизу — фото не душим */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Координаты — верхний левый угол */}
      <div className="relative z-10 p-6 md:p-10">
        <p className="text-[10px] font-medium uppercase tracking-[4px] text-white/60">
          52°N · Курильское озеро · Камчатка
        </p>
      </div>

      {/* Текст + CTA — прижаты к низу */}
      <div className="relative z-10 mt-auto px-6 md:px-10 pb-12 md:pb-16 max-w-2xl">
        <h1
          className="font-playfair text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6"
          style={{ textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}
        >
          Дикая Камчатка.
          <br />
          Ваш маршрут.
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-3 bg-white text-[var(--text-primary)] font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-white/90 transition-all"
          >
            Спланировать поездку
            <span className="text-base">→</span>
          </button>
          <a
            href="/routes"
            className="inline-flex items-center gap-2 border border-white/50 text-white font-medium text-sm px-6 py-3.5 rounded-full hover:bg-white/10 transition-all"
          >
            Все маршруты
          </a>
        </div>
      </div>
    </section>
  );
}
