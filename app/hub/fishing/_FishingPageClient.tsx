'use client';

import { useState } from 'react';
import { Fish, Clock, Users, Mountain, ChevronRight, Phone, Calendar } from 'lucide-react';
import Link from 'next/link';

interface FishingTour {
  id: number;
  title: string;
  short_description: string | null;
  description: string | null;
  base_price: number;
  duration_hours: number;
  max_participants: number;
  min_participants: number;
  difficulty: string | null;
  photos: string[];
  included: unknown;
  season_start: string | null;
  season_end: string | null;
  operator_name: string;
  operator_slug: string;
}

const DURATION_FILTERS = [
  { id: 'all',   label: 'Все туры' },
  { id: 'day',   label: 'День'        },
  { id: 'multi', label: 'Многодневные' },
] as const;

function durationLabel(hours: number): string {
  if (hours <= 12)  return 'Полдня';
  if (hours <= 24)  return '1 день';
  if (hours <= 48)  return '2 дня';
  const days = Math.round(hours / 24);
  return `${days} ${days < 5 ? 'дня' : 'дней'}`;
}

function priceLabel(price: number): string {
  return price.toLocaleString('ru-RU') + ' ₽';
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   'var(--success)',
  medium: 'var(--warning)',
  hard:   'var(--danger)',
};
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Начинающим', medium: 'Опытным', hard: 'Профессионалам',
};

function TourCard({ tour }: { tour: FishingTour }) {
  const photo = tour.photos?.[0];
  const diff  = tour.difficulty ?? 'easy';

  return (
    <Link href={`/marketplace/tours/${tour.id}`} className="group block">
      <div className="ds-card overflow-hidden hover:shadow-md transition-all duration-200 h-full flex flex-col">
        {/* Фото */}
        <div className="relative h-48 bg-[var(--bg-hover)] overflow-hidden">
          {photo ? (
            <img
              src={photo}
              alt={tour.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Fish className="w-16 h-16 text-[var(--text-muted)] opacity-30" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span
              className="text-[10px] font-semibold px-2 py-1 rounded-full"
              style={{ background: `${DIFFICULTY_COLORS[diff]}22`, color: DIFFICULTY_COLORS[diff] }}
            >
              {DIFFICULTY_LABELS[diff] ?? diff}
            </span>
          </div>
        </div>

        {/* Контент */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
            {tour.title}
          </h3>
          {tour.short_description && (
            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed flex-1">
              {tour.short_description.slice(0, 100)}...
            </p>
          )}

          {/* Мета */}
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {durationLabel(tour.duration_hours)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              до {tour.max_participants} чел.
            </span>
          </div>

          {/* Цена + кнопка */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border)]">
            <div>
              <p className="text-xs text-[var(--text-muted)]">от</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{priceLabel(tour.base_price)}</p>
            </div>
            <span className="ds-btn ds-btn-primary text-sm flex items-center gap-1.5">
              Подробнее
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────

export function FishingPageClient({ tours }: { tours: FishingTour[] }) {
  const [filter, setFilter] = useState<'all' | 'day' | 'multi'>('all');

  const filtered = tours.filter(t => {
    if (filter === 'day')   return t.duration_hours <= 24;
    if (filter === 'multi') return t.duration_hours > 24;
    return true;
  });

  const minPrice = Math.min(...tours.map(t => t.base_price));
  const maxDays  = Math.max(...tours.map(t => Math.round(t.duration_hours / 24)));

  return (
    <div className="ds-page min-h-screen">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-lg mb-10"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0d2137 100%)' }}>
        <div className="relative px-8 py-14 md:py-20 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Fish className="w-5 h-5 text-[var(--ocean)]" />
            <span className="text-sm font-medium text-[var(--ocean)] uppercase tracking-wider">
              Камчатская рыбалка
            </span>
          </div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Рыбалка на реке Камчатка
          </h1>
          <p className="text-lg text-[rgba(255,255,255,0.7)] mb-8 leading-relaxed max-w-xl">
            Лосось, кижуч, чавыча, нерка. Профессиональные гиды, снаряжение включено,
            трансфер от Петропавловска-Камчатского.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.1)] rounded-md px-4 py-2">
              <Fish className="w-4 h-4 text-[var(--ocean)]" />
              <span className="text-sm text-white">5 видов лосося</span>
            </div>
            <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.1)] rounded-md px-4 py-2">
              <Calendar className="w-4 h-4 text-[var(--ocean)]" />
              <span className="text-sm text-white">Весь год</span>
            </div>
            <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.1)] rounded-md px-4 py-2">
              <Mountain className="w-4 h-4 text-[var(--ocean)]" />
              <span className="text-sm text-white">от {priceLabel(minPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Быстрый контакт ─────────────────────────────────────────── */}
      <div className="ds-card p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Нужна консультация?</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Поможем выбрать тур под ваши даты и уровень подготовки
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="tel:+74152264444"
            className="ds-btn ds-btn-secondary flex items-center gap-2 text-sm"
          >
            <Phone className="w-4 h-4" />
            Позвонить
          </a>
          <Link href="/ai-assistant?q=хочу+рыбачить+на+Камчатке"
            className="ds-btn ds-btn-primary flex items-center gap-2 text-sm">
            Спросить Кузьмича
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Фильтры ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="ds-h2">Туры ({filtered.length})</h2>
        <div className="flex gap-2">
          {DURATION_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Карточки туров ──────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {filtered.map(t => <TourCard key={t.id} tour={t} />)}
      </div>

      {/* ── Почему мы ───────────────────────────────────────────────── */}
      <div className="ds-card p-8 mb-8">
        <h2 className="ds-h2 mb-6">Почему выбирают нас</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Профессиональные гиды', body: 'Местные рыбаки с 10+ лет опыта. Знают каждый перекат реки Камчатки.' },
            { title: 'Всё включено', body: 'Трансфер, снаряжение, наживка, разделка рыбы и упаковка для перевозки.' },
            { title: 'Весь сезон', body: 'Зимняя рыбалка со льда — с ноября. Летний лосось — с июня по октябрь.' },
          ].map(({ title, body }) => (
            <div key={title}>
              <div className="w-8 h-1 bg-[var(--accent)] rounded mb-3" />
              <p className="font-semibold text-[var(--text-primary)] mb-2">{title}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEO-текст ───────────────────────────────────────────────── */}
      <div className="prose prose-sm max-w-none text-[var(--text-secondary)] leading-relaxed">
        <p>
          Рыбалка на Камчатке — это уникальный опыт, недоступный больше нигде в России.
          Река Камчатка является одной из крупнейших нерестовых рек в мире: здесь нерестятся
          все пять видов тихоокеанского лосося — чавыча, нерка, кета, горбуша и кижуч.
        </p>
        <p className="mt-3">
          Наш партнёр — компания «Камчатская рыбалка» — работает на реке Камчатке с 2010 года.
          Туры проводятся круглогодично: зимой рыбачат со льда, летом — с берега и моторных лодок.
          Продолжительность туров от 1 до 7 дней, группы от {Math.min(...tours.map(t => t.min_participants))}
          до {maxDays * 4} человек.
        </p>
      </div>

    </div>
  );
}
