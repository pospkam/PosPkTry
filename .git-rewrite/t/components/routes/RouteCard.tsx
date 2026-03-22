'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Flame, Thermometer, Anchor, Mountain, Leaf, Fish,
  Snowflake, Plane, Car, Waves, Droplets, Wind,
  Footprints, PawPrint, MapPin, Tag, Clock, Heart, CalendarCheck,
} from 'lucide-react';

export interface RouteItem {
  id: string;
  category: string;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  priceFrom: number | null;
  difficulty: string | null;
  durationDays: number | null;
  sourceName: string | null;
  bestMonths?: number[] | null;
  offerCount?: number;
  topOperatorName?: string;
  minOfferPrice?: number | null;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  vulkani:             { label: 'Вулканы',             icon: Flame,       color: 'var(--accent)' },
  termalnye_istochniki:{ label: 'Термальные источники',icon: Thermometer, color: 'var(--ocean)' },
  morskie_progulki:    { label: 'Морские прогулки',    icon: Anchor,      color: 'var(--ocean)' },
  mountains:           { label: 'Горы',                icon: Mountain,    color: 'var(--text-secondary)' },
  eco:                 { label: 'Экомаршруты',         icon: Leaf,        color: 'var(--success)' },
  rybalka:             { label: 'Рыбалка',             icon: Fish,        color: 'var(--ocean)' },
  snegohod:            { label: 'Снегоходы',           icon: Snowflake,   color: 'var(--ocean)' },
  vertoletnye_tury:    { label: 'Вертолётные туры',    icon: Plane,       color: 'var(--accent)' },
  dzhip:               { label: 'Джип-туры',           icon: Car,         color: 'var(--text-secondary)' },
  trekking:            { label: 'Трекинг',             icon: Footprints,  color: 'var(--success)' },
  geyzery:             { label: 'Гейзеры',             icon: Wind,        color: 'var(--accent)' },
  rivers:              { label: 'Реки',                icon: Waves,       color: 'var(--ocean)' },
  lakes:               { label: 'Озёра',               icon: Droplets,    color: 'var(--ocean)' },
  medvedi:             { label: 'Медведи',             icon: PawPrint,    color: 'var(--warning)' },
};

const CARD_IMAGES: Record<string, string> = {
  vulkani:              '/images/bento/mutnovsky.jpg',
  geyzery:              '/images/bento/mutnovsky.jpg',
  termalnye_istochniki: '/images/bento/paratunka.jpg',
  morskie_progulki:     '/images/activities/sea.jpg',
  mountains:            '/images/gallery/stela.jpg',
  eco:                  '/images/gallery/aurora.jpg',
  rybalka:              '/images/activities/fishing.jpg',
  snegohod:             '/images/activities/snowmobile.jpg',
  vertoletnye_tury:     '/images/activities/helicopter.jpg',
  dzhip:                '/images/activities/jeep.jpg',
  trekking:             '/images/gallery/camp-sunset.jpg',
  rivers:               '/images/bento/khalaktyr.jpg',
  lakes:                '/images/gallery/bay-sunset.jpg',
  medvedi:              '/images/gallery/road-winter.jpg',
};

const DIFFICULTY_LABEL: Record<string, { label: string; color: string }> = {
  easy:    { label: 'Лёгкий',  color: 'var(--success)' },
  medium:  { label: 'Средний', color: 'var(--warning)' },
  hard:    { label: 'Сложный', color: 'var(--accent)' },
  extreme: { label: 'Экстрим', color: 'var(--danger)' },
};

export default function RouteCard({ route }: { route: RouteItem }) {
  const meta = CATEGORY_META[route.category] ?? { label: route.category, icon: MapPin, color: 'var(--text-secondary)' };
  const Icon = meta.icon;
  const diff = route.difficulty ? DIFFICULTY_LABEL[route.difficulty] : null;
  const desc = route.description
    ? route.description.replace(/<[^>]+>/g, '').slice(0, 100).trimEnd() + (route.description.length > 100 ? '...' : '')
    : null;
  const image = CARD_IMAGES[route.category] ?? '/images/bento/mutnovsky.jpg';

  // Сезонный бейдж
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const isInSeason = route.bestMonths?.includes(currentMonth) ?? false;
  const hasSeasonData = route.bestMonths && route.bestMonths.length > 0;

  // Оператор info
  const displayPrice = route.minOfferPrice ?? route.priceFrom;
  const hasOffers = (route.offerCount ?? 0) > 0;

  const [liked, setLiked] = useState(false);
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
      if (res.ok) {
        setLiked(true);
      } else if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=' + encodeURIComponent(window.location.pathname);
      }
    } catch {
      // silence
    } finally {
      setLiking(false);
    }
  }, [liking, liked, route.id, route.title]);

  return (
    <div className="group relative bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--accent)]/40 hover:shadow-md transition-all duration-200">

      {/* Photo */}
      <Link href={`/routes/${route.id}`} className="block relative" style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg-hover)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={route.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 350ms ease' }}
          className="group-hover:scale-105"
        />
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Category badge */}
        <span
          className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: meta.color, color: '#fff' }}
        >
          <Icon className="w-2.5 h-2.5" />
          {meta.label}
        </span>

        {/* Duration badge */}
        {route.durationDays != null && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-black/60 text-white">
            <Clock className="w-2.5 h-2.5" />
            {route.durationDays} {pluralDays(route.durationDays)}
          </span>
        )}

        {/* Season badge */}
        {hasSeasonData && (
          <span
            className={`absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
              isInSeason
                ? 'bg-[var(--success)] text-white'
                : 'bg-black/60 text-white/80'
            }`}
          >
            <CalendarCheck className="w-2.5 h-2.5" />
            {isInSeason ? 'Сейчас сезон' : 'Сезонный'}
          </span>
        )}
      </Link>

      {/* Favorite button (outside Link to avoid navigation) */}
      <button
        type="button"
        onClick={handleFavorite}
        aria-label={liked ? 'В избранном' : 'Добавить в избранное'}
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          background: liked ? 'var(--accent)' : 'rgba(0,0,0,0.45)',
          border: liked ? 'none' : '1px solid rgba(255,255,255,0.2)',
          opacity: liking ? 0.5 : 1,
        }}
      >
        <Heart
          className="w-3.5 h-3.5"
          style={{ color: '#fff', fill: liked ? '#fff' : 'none' }}
        />
      </button>

      {/* Content */}
      <Link href={`/routes/${route.id}`} className="block p-3 flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
          {route.title}
        </h3>

        {desc && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {desc}
          </p>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {displayPrice != null && displayPrice > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)]">
              <Tag className="w-2.5 h-2.5" />
              от {displayPrice.toLocaleString('ru-RU')} ₽
            </span>
          )}
          {diff && (
            <span
              className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ color: diff.color, background: `color-mix(in srgb, ${diff.color} 10%, transparent)` }}
            >
              {diff.label}
            </span>
          )}
          {hasOffers && (
            <span className="inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
              Бронирование
            </span>
          )}
          {route.lat != null && (
            <span className="ml-auto text-[var(--ocean)]" title="Есть на карте">
              <MapPin className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Operator */}
        {route.topOperatorName && (
          <p className="text-[10px] text-[var(--text-muted)] truncate">
            {route.topOperatorName}
          </p>
        )}
      </Link>
    </div>
  );
}

function pluralDays(n: number) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}
