'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart, Clock, ArrowRight,
  Flame, Thermometer, Anchor, Fish,
  Snowflake, Plane, Car, PawPrint, Waves,
} from 'lucide-react';
import type { RouteItem } from './RouteCard';

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  vulkani:              { label: 'Вулканы',       icon: Flame,        color: 'var(--accent)' },
  termalnye_istochniki: { label: 'Источники',     icon: Thermometer,  color: 'var(--ocean)' },
  morskie_progulki:     { label: 'Море',          icon: Anchor,       color: 'var(--ocean)' },
  rybalka:              { label: 'Рыбалка',       icon: Fish,         color: 'var(--ocean)' },
  snegohod:             { label: 'Снегоходы',     icon: Snowflake,    color: 'var(--ocean)' },
  vertoletnye_tury:     { label: 'Вертолёт',      icon: Plane,        color: 'var(--accent)' },
  dzhip:                { label: 'Джип-тур',      icon: Car,          color: 'var(--text-secondary)' },
  medvedi:              { label: 'Медведи',       icon: PawPrint,     color: 'var(--warning)' },
  splav:                { label: 'Сплав',         icon: Waves,        color: 'var(--ocean)' },
  eco:                  { label: 'Экскурсия',     icon: Anchor,       color: 'var(--success)' },
};

const CARD_IMAGES: Record<string, string> = {
  vulkani:              '/images/bento/mutnovsky.jpg',
  termalnye_istochniki: '/images/bento/paratunka.jpg',
  morskie_progulki:     '/images/activities/sea.jpg',
  rybalka:              '/images/activities/fishing.jpg',
  snegohod:             '/images/activities/snowmobile.jpg',
  vertoletnye_tury:     '/images/activities/helicopter.jpg',
  dzhip:                '/images/activities/jeep.jpg',
  medvedi:              '/images/gallery/road-winter.jpg',
  splav:                '/images/bento/khalaktyr.jpg',
  eco:                  '/images/gallery/aurora.jpg',
};

function daysLabel(n: number) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return `${n} дней`;
  if (m10 === 1) return `${n} день`;
  if (m10 >= 2 && m10 <= 4) return `${n} дня`;
  return `${n} дней`;
}

export default function TourCard({ route }: { route: RouteItem }) {
  const meta    = CATEGORY_META[route.category] ?? { label: 'Тур', icon: Anchor, color: 'var(--accent)' };
  const Icon    = meta.icon;
  const image   = route.imageUrl ?? (route.hasAiImage ? `/api/images/route/${route.id}` : (CARD_IMAGES[route.category] ?? '/images/hero/hero-dark.jpg'));
  const price   = route.minOfferPrice ?? route.priceFrom;

  const currentMonth = new Date().getMonth() + 1;
  const isInSeason   = route.bestMonths?.includes(currentMonth) ?? false;

  const [liked,  setLiked]  = useState(false);
  const [liking, setLiking] = useState(false);

  const handleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (liking || liked) return;
    setLiking(true);
    try {
      const res = await fetch('/api/tourist/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: 'route', item_id: route.id, title: route.title }),
      });
      if (res.ok) setLiked(true);
      else if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=' + encodeURIComponent(window.location.pathname);
      }
    } catch { /* silence */ }
    finally { setLiking(false); }
  }, [liking, liked, route.id, route.title]);

  return (
    <article className="group">
      {/* ── Фото ── */}
      <Link
        href={`/routes/${route.id}`}
        className="block relative overflow-hidden rounded-lg"
        style={{ aspectRatio: '3/4' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={route.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        {/* Категория тура — левый верх */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)]">
          <Icon className="w-3 h-3" style={{ color: meta.color }} />
          {meta.label}
        </span>

        {/* Сезон */}
        {isInSeason && (
          <span className="absolute top-3.5 left-3 translate-x-[calc(100%+1.75rem)] w-2 h-2 rounded-full bg-[var(--success)]" title="Сейчас сезон" />
        )}

        {/* Избранное */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={liked ? 'В избранном' : 'В избранное'}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
          style={{ background: liked ? 'var(--accent)' : 'var(--bg-card)', opacity: liking ? 0.5 : 1 }}
        >
          <Heart
            className="w-3.5 h-3.5 transition-all"
            style={{ color: liked ? 'var(--bg-card)' : 'var(--text-secondary)', fill: liked ? 'var(--bg-card)' : 'none' }}
          />
        </button>

        {/* Цена — левый низ */}
        {price != null && price > 0 && (
          <div className="absolute bottom-3 left-3">
            <span className="text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-card)] px-2.5 py-1 rounded leading-none">
              от {price.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        )}
      </Link>

      {/* ── Текст ── */}
      <Link href={`/routes/${route.id}`} className="block mt-3 space-y-1.5">
        <h3
          className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
          style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem' }}
        >
          {route.title}
        </h3>

        {/* Мета: дни + сложность */}
        {(route.durationDays != null || route.difficulty != null) && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            {route.durationDays != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysLabel(route.durationDays)}
              </span>
            )}
            {route.durationDays != null && route.difficulty && <span>·</span>}
            {route.difficulty && (
              <span>{route.difficulty === 'easy' ? 'Легко' : route.difficulty === 'medium' ? 'Средне' : 'Сложно'}</span>
            )}
          </div>
        )}

        {/* CTA */}
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] group-hover:underline">
          Подробнее
          <ArrowRight className="w-3 h-3" />
        </span>
      </Link>
    </article>
  );
}
