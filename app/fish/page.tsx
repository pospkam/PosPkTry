import type { Metadata } from 'next';
import Link from 'next/link';
import { Fish, Calendar, Trophy } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { FISH_SPECIES, formatSeasonMonths } from '@/lib/fish-species';

export const metadata: Metadata = {
  title: 'Рыбы Камчатки — справочник видов | TourHab',
  description:
    'Полный справочник промысловых рыб Камчатки: лосось, чавыча, нерка, кижуч, горбуша, краб, палтус. Сезоны, методы ловли, рекорды, ареалы обитания.',
  keywords: [
    'рыбы Камчатки', 'лосось Камчатка', 'чавыча', 'нерка', 'кижуч', 'горбуша',
    'рыбалка Камчатка', 'камчатский краб', 'палтус', 'рыболовные туры',
  ],
  alternates: { canonical: 'https://tourhab.ru/fish' },
  openGraph: {
    title: 'Рыбы Камчатки — справочник видов',
    description: '15 видов промысловых рыб Камчатки: сезоны, методы ловли, рекорды.',
    url: 'https://tourhab.ru/fish',
    siteName: 'TourHab',
    locale: 'ru_RU',
    type: 'website',
  },
};

export default function FishIndexPage() {
  return (
    <>
      <Header />
      <main className="ds-page pt-20 pb-16">

        {/* Hero */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mb-2">
            Справочник
          </p>
          <h1
            className="ds-h1 mb-3"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Рыбы Камчатки
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl">
            {FISH_SPECIES.length} видов — от чавычи до камчатского краба. Сезоны, методы ловли, рекорды и маршруты.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FISH_SPECIES.map(species => (
            <Link
              key={species.id}
              href={`/fish/${species.id}`}
              className="ds-card group flex items-start gap-4 hover:shadow-md transition-all duration-200 hover:border-[var(--accent)]/30"
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                style={{ background: `${species.color}18` }}
              >
                <Fish className="w-6 h-6" style={{ color: species.color }} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Name */}
                <h2 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {species.name}
                </h2>
                <p className="text-xs text-[var(--text-muted)] italic mb-2">{species.nameLatin}</p>

                {/* Short desc */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {species.shortDesc}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Calendar className="w-3 h-3" />
                    {species.season}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Trophy className="w-3 h-3" />
                    {species.recordKg}
                  </span>
                </div>

                {/* Season months strip */}
                <div className="flex gap-0.5 mt-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const active = species.seasonMonths.includes(i + 1);
                    return (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background: active ? species.color : 'var(--bg-hover)',
                          opacity: active ? 1 : 0.4,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/routes?activity_type=fishing"
            className="ds-btn ds-btn-primary px-8 py-3 text-base font-semibold"
          >
            Туры на рыбалку
          </Link>
        </div>
      </main>
    </>
  );
}
