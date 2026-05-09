import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Fish, Calendar, Trophy, MapPin, Target, Sparkles, ArrowLeft, ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { FISH_SPECIES, FISH_BY_ID, formatSeasonMonths } from '@/lib/fish-species';
import { query } from '@/lib/database';

export const revalidate = 3600;

const MONTH_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

interface Props { params: Promise<{ id: string }> }

export async function generateStaticParams() {
  return FISH_SPECIES.map(f => ({ id: f.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const species = FISH_BY_ID[id];
  if (!species) return { title: 'Вид не найден' };

  const title = `${species.name} на Камчатке — ${species.nameLatin} | TourHab`;
  const desc = `${species.shortDesc} Сезон: ${species.season}. Рекорд: ${species.recordKg}. Место: ${species.habitat}.`;

  return {
    title,
    description: desc,
    keywords: [
      species.name, `${species.name} Камчатка`, `рыбалка на ${species.name.toLowerCase()}`,
      species.nameLatin, 'рыбалка Камчатка', 'рыболовные туры',
    ],
    alternates: { canonical: `https://tourhab.ru/fish/${id}` },
    openGraph: {
      title,
      description: desc,
      url: `https://tourhab.ru/fish/${id}`,
      siteName: 'TourHab',
      locale: 'ru_RU',
      type: 'article',
    },
  };
}

interface FishingTour {
  id: number;
  title: string;
  base_price: number;
  operator_name: string;
  operator_slug: string;
  duration_hours: number;
}

async function getFishingTours(): Promise<FishingTour[]> {
  try {
    const result = await query<FishingTour>(`
      SELECT ot.id::int, ot.title, ot.base_price::float,
             ot.duration_hours::float,
             p.name AS operator_name, p.slug AS operator_slug
      FROM operator_tours ot
      JOIN partners p ON p.id = ot.operator_id
      WHERE ot.activity_type = 'fishing'
        AND ot.is_active = true AND ot.is_published = true AND ot.deleted_at IS NULL
      ORDER BY ot.base_price ASC
      LIMIT 6
    `);
    return result.rows;
  } catch {
    return [];
  }
}

export default async function FishDetailPage({ params }: Props) {
  const { id } = await params;
  const species = FISH_BY_ID[id];
  if (!species) notFound();

  const tours = await getFishingTours();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${species.name} на Камчатке — ${species.nameLatin}`,
    description: species.shortDesc,
    url: `https://tourhab.ru/fish/${id}`,
    inLanguage: 'ru',
    about: { '@type': 'Thing', name: species.name, alternateName: species.nameLatin },
    publisher: { '@type': 'Organization', name: 'TourHab', url: 'https://tourhab.ru' },
  };

  // Other species (exclude current)
  const others = FISH_SPECIES.filter(f => f.id !== id).slice(0, 6);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="pt-16 pb-16">

        {/* Hero banner */}
        <div
          className="w-full py-14 px-4"
          style={{ background: `linear-gradient(135deg, ${species.color}12 0%, ${species.color}06 100%)` }}
        >
          <div className="max-w-4xl mx-auto">
            <Link
              href="/fish"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] mb-6 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Все рыбы Камчатки
            </Link>

            <div className="flex items-start gap-5">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${species.color}20` }}
              >
                <Fish className="w-8 h-8" style={{ color: species.color }} />
              </div>
              <div>
                <h1
                  className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] leading-tight"
                  style={{ fontFamily: 'var(--font-playfair)' }}
                >
                  {species.name}
                </h1>
                <p className="text-[var(--text-muted)] italic text-lg mt-1">{species.nameLatin}</p>
              </div>
            </div>

            {/* Season bar */}
            <div className="mt-8">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                Сезон ловли
              </p>
              <div className="flex gap-1">
                {MONTH_SHORT.map((m, i) => {
                  const active = species.seasonMonths.includes(i + 1);
                  return (
                    <div key={m} className="flex-1 text-center">
                      <div
                        className="h-2 rounded-full mb-1"
                        style={{
                          background: active ? species.color : 'var(--bg-hover)',
                          opacity: active ? 1 : 0.4,
                        }}
                      />
                      <span
                        className="text-[9px] font-medium hidden sm:block"
                        style={{ color: active ? species.color : 'var(--text-muted)' }}
                      >
                        {m}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                <span className="font-semibold" style={{ color: species.color }}>{species.season}</span>
                {' — '}
                {formatSeasonMonths(species.seasonMonths) === 'Круглый год'
                  ? 'доступна круглый год'
                  : `активный сезон: ${formatSeasonMonths(species.seasonMonths)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-10 space-y-10">

          {/* Описание */}
          <section>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
              {species.shortDesc}
            </p>
          </section>

          {/* Характеристики */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="ds-card">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4" style={{ color: species.color }} />
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Рекорд
                </span>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)]">{species.recordKg}</p>
            </div>
            <div className="ds-card">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" style={{ color: species.color }} />
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Место
                </span>
              </div>
              <p className="text-sm text-[var(--text-primary)] leading-snug">{species.habitat}</p>
            </div>
            <div className="ds-card">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{ color: species.color }} />
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Методы ловли
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {species.methods.map(m => (
                  <span
                    key={m}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${species.color}12`, color: species.color }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Интересный факт */}
          <section
            className="rounded-xl p-5 flex gap-3"
            style={{ background: `${species.color}08`, border: `1px solid ${species.color}20` }}
          >
            <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: species.color }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: species.color }}>
                Интересный факт
              </p>
              <p className="text-[var(--text-secondary)] leading-relaxed">{species.funFact}</p>
            </div>
          </section>

          {/* Туры на рыбалку */}
          {tours.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4"
                style={{ fontFamily: 'var(--font-playfair)' }}>
                Туры на рыбалку
              </h2>
              <div className="space-y-3">
                {tours.map(tour => (
                  <Link
                    key={tour.id}
                    href={`/marketplace/tours/${tour.id}`}
                    className="ds-card flex items-center justify-between gap-4 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {tour.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {tour.operator_name}
                        {tour.duration_hours > 0 && (
                          <> · {tour.duration_hours >= 24
                            ? `${Math.round(tour.duration_hours / 24)} дн`
                            : `${tour.duration_hours} ч`}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-[var(--text-primary)]">
                        {tour.base_price.toLocaleString('ru-RU')} ₽
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/routes?activity_type=fishing"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                Все рыболовные туры <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </section>
          )}

          {/* Другие виды */}
          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4"
              style={{ fontFamily: 'var(--font-playfair)' }}>
              Другие виды
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {others.map(s => (
                <Link
                  key={s.id}
                  href={`/fish/${s.id}`}
                  className="ds-card flex items-center gap-3 hover:shadow-sm transition-all duration-200 group py-3"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}18` }}
                  >
                    <Fish className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{s.season}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
