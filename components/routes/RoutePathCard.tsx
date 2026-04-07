'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Heart, Clock, Footprints, ChevronUp, ChevronsUp, AlertTriangle, MapPin } from 'lucide-react';
import type { RouteItem } from './RouteCard';

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Лёгкий',  color: 'var(--success)', Icon: ChevronUp },
  medium: { label: 'Средний', color: 'var(--warning)', Icon: ChevronsUp },
  hard:   { label: 'Сложный', color: 'var(--danger)',  Icon: AlertTriangle },
} as const;

const ACTIVITY_LABELS: Record<string, string> = {
  trekking:      'Треккинг',
  eco:           'Экотуризм',
  hiking:        'Пеший поход',
  boat_trip:     'Сплав',
  snowmobile:    'Снегоход',
  ski:           'Лыжи',
  other:         'Маршрут',
};

const CARD_IMAGES: Record<string, string> = {
  trekking: '/images/gallery/camp-sunset.jpg',
  eco:      '/images/gallery/aurora.jpg',
  splav:    '/images/bento/khalaktyr.jpg',
  snegohod: '/images/activities/snowmobile.jpg',
};

function daysLabel(n: number) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return `${n} дней`;
  if (m10 === 1) return `${n} день`;
  if (m10 >= 2 && m10 <= 4) return `${n} дня`;
  return `${n} дней`;
}

export default function RoutePathCard({ route }: { route: RouteItem }) {
  const image        = route.imageUrl ?? (route.hasAiImage ? `/api/images/route/${route.id}` : (CARD_IMAGES[route.category] ?? '/images/gallery/camp-sunset.jpg'));
  const diffKey      = (route.difficulty ?? 'easy') as keyof typeof DIFFICULTY_CONFIG;
  const diff         = DIFFICULTY_CONFIG[diffKey] ?? DIFFICULTY_CONFIG.easy;
  const DiffIcon     = diff.Icon;
  const actLabel     = ACTIVITY_LABELS[route.activityType ?? route.category] ?? 'Маршрут';

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
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Тип активности — левый верх */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)]">
          <Footprints className="w-3 h-3 text-[var(--success)]" />
          {actLabel}
        </span>

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

        {/* Сложность + длительность — низ */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${diff.color}22`, color: diff.color, border: `1px solid ${diff.color}44` }}
          >
            <DiffIcon className="w-3 h-3" />
            {diff.label}
          </span>
          {route.durationDays != null && (
            <span className="inline-flex items-center gap-1 text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              {daysLabel(route.durationDays)}
            </span>
          )}
        </div>
      </Link>

      {/* ── Текст ── */}
      <Link href={`/routes/${route.id}`} className="block mt-3 space-y-1.5">
        <h3
          className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
          style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem' }}
        >
          {route.title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
          {route.description}
        </p>
        {route.lat != null && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <MapPin className="w-3 h-3" />
            На карте
          </span>
        )}
      </Link>
    </article>
  );
}
