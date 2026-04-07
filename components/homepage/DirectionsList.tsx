'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

const DIRECTIONS = [
  {
    num: '01',
    title: 'Вулканы',
    sub: 'Восхождения · Облёты',
    href: '/marketplace?activity_type=trekking',
    image: '/images/categories/vulkany.jpg',
    tag: 'Лето / Осень',
  },
  {
    num: '02',
    title: 'Медведи',
    sub: 'Наблюдение в дикой природе',
    href: '/marketplace?activity_type=bears',
    image: '/images/categories/medvedi.jpg',
    tag: 'Июль — Сентябрь',
  },
  {
    num: '03',
    title: 'Рыбалка',
    sub: 'Чавыча · Нерка · Кижуч',
    href: '/hub/fishing',
    image: '/images/categories/rybalka.jpg',
    tag: 'Июнь — Август',
  },
  {
    num: '04',
    title: 'Горячие источники',
    sub: 'Паратунка · Налычево',
    href: '/marketplace?activity_type=thermal',
    image: '/images/categories/termy.jpg',
    tag: 'Круглый год',
  },
  {
    num: '05',
    title: 'Океан',
    sub: 'Касатки · Морские прогулки',
    href: '/marketplace?activity_type=boat_trip',
    image: '/images/categories/morskie.jpg',
    tag: 'Июнь — Октябрь',
  },
  {
    num: '06',
    title: 'Вертолёты',
    sub: 'Долина гейзеров · Кальдера',
    href: '/marketplace?activity_type=helicopter',
    image: '/images/categories/vertolety.jpg',
    tag: 'Июнь — Сентябрь',
  },
];

export function DirectionsList() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="directions" className="relative">
      {/* ── Fixed photo panel (desktop) ── */}
      <div
        aria-hidden
        className="hidden lg:block fixed top-0 right-0 w-[42vw] h-screen pointer-events-none z-20 overflow-hidden"
        style={{ transition: 'opacity 300ms ease' }}
      >
        {DIRECTIONS.map((d, i) => (
          <div
            key={d.num}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: hovered === i ? 1 : 0 }}
          >
            <Image
              src={d.image}
              alt={d.title}
              fill
              sizes="42vw"
              className="object-cover"
              priority={i === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/30" />
          </div>
        ))}
        {/* Tag badge that changes with hover */}
        {hovered !== null && (
          <div
            className="absolute bottom-10 left-8 text-[10px] tracking-[0.25em] uppercase font-medium text-white/60"
            style={{ transition: 'opacity 200ms' }}
          >
            {DIRECTIONS[hovered].tag}
          </div>
        )}
      </div>

      {/* ── List panel ── */}
      <div className="lg:w-[58vw] bg-[var(--bg-primary)]">
        {/* Header */}
        <div className="px-6 md:px-12 pt-20 pb-12 border-b border-[var(--border)]">
          <p className="text-[10px] tracking-[0.3em] uppercase font-medium text-[var(--text-muted)] mb-4">
            Что посмотреть
          </p>
          <h2
            className="font-playfair font-bold text-[var(--text-primary)] leading-tight"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}
          >
            Направления
          </h2>
        </div>

        {/* List rows */}
        <ul>
          {DIRECTIONS.map((d, i) => (
            <li key={d.num} className="border-b border-[var(--border)]">
              <Link
                href={d.href}
                className="group flex items-center justify-between px-6 md:px-12 py-7 transition-colors duration-150 hover:bg-[var(--bg-hover)]"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Left: num + text */}
                <div className="flex items-center gap-6 md:gap-10">
                  <span className="text-[11px] font-mono text-[var(--text-muted)] w-5 tabular-nums select-none">
                    {d.num}
                  </span>
                  <div>
                    <h3
                      className="font-playfair font-bold text-[var(--text-primary)] leading-none group-hover:text-[var(--accent)] transition-colors"
                      style={{ fontSize: 'clamp(1.35rem, 2.5vw, 2rem)' }}
                    >
                      {d.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 font-light">{d.sub}</p>
                  </div>
                </div>

                {/* Right: mobile thumbnail + arrow */}
                <div className="flex items-center gap-4">
                  {/* Mobile-only thumbnail */}
                  <div className="lg:hidden w-14 h-14 rounded overflow-hidden flex-shrink-0 relative">
                    <Image src={d.image} alt={d.title} fill sizes="56px" className="object-cover" />
                  </div>
                  <span className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Footer link */}
        <div className="px-6 md:px-12 py-8">
          <Link
            href="/routes"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:opacity-75 transition-opacity"
          >
            Все маршруты и места
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
