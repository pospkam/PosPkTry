'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const DIRECTIONS = [
  {
    num: '01',
    title: 'Вулканы',
    sub: 'Восхождения · Облёты',
    href: '/marketplace?activity_type=trekking',
    tag: 'Лето / Осень',
  },
  {
    num: '02',
    title: 'Медведи',
    sub: 'Наблюдение в дикой природе',
    href: '/marketplace?activity_type=bears',
    tag: 'Июль — Сентябрь',
  },
  {
    num: '03',
    title: 'Рыбалка',
    sub: 'Чавыча · Нерка · Кижуч',
    href: '/hub/fishing',
    tag: 'Июнь — Август',
  },
  {
    num: '04',
    title: 'Горячие источники',
    sub: 'Паратунка · Налычево',
    href: '/marketplace?activity_type=thermal',
    tag: 'Круглый год',
  },
  {
    num: '05',
    title: 'Океан',
    sub: 'Касатки · Морские прогулки',
    href: '/marketplace?activity_type=boat_trip',
    tag: 'Июнь — Октябрь',
  },
  {
    num: '06',
    title: 'Вертолёты',
    sub: 'Долина гейзеров · Кальдера',
    href: '/marketplace?activity_type=helicopter',
    tag: 'Июнь — Сентябрь',
  },
];

export function DirectionsList() {
  return (
    <section id="directions" className="relative bg-[var(--bg-primary)] py-14 md:py-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="px-6 md:px-12 pb-8 border-b border-[var(--border)]">
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
        <ul className="border-b border-[var(--border)]">
          {DIRECTIONS.map((d, i) => (
            <li key={d.num} className="border-b border-[var(--border)]">
              <Link
                href={d.href}
                className="group flex items-center justify-between px-6 md:px-12 py-6 transition-colors duration-150 hover:bg-[var(--bg-hover)]"
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

                {/* Right: tag + arrow */}
                <div className="flex items-center gap-4">
                  <span className="hidden md:inline text-[10px] tracking-[0.22em] uppercase text-[var(--text-muted)]">
                    {d.tag}
                  </span>
                  <span className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Footer link */}
        <div className="px-6 md:px-12 py-6">
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
