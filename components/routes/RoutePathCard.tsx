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

function daysLabel(n: number) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return `${n} дней`;
  if (m10 === 1) return `${n} день`;
  if (m10 >= 2 && m10 <= 4) return `${n} дня`;
  return `${n} дней`;
}

export default function RoutePathCard({ route }: { route: RouteItem }) {
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
    <article className="group rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-primary)]">
          <Footprints className="w-3 h-3 text-[var(--success)]" />
          {actLabel}
        </span>
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={liked ? 'В избранном' : 'В избранное'}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
          style={{ background: liked ? 'var(--accent)' : 'var(--bg-hover)', opacity: liking ? 0.5 : 1 }}
        >
          <Heart
            className="w-3.5 h-3.5 transition-all"
            style={{ color: liked ? 'var(--bg-card)' : 'var(--text-secondary)', fill: liked ? 'var(--bg-card)' : 'none' }}
          />
        </button>
      </div>

      <Link href={`/routes/${route.id}`} className="block space-y-1.5">
        <h3
          className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
          style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem' }}
        >
          {route.title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
          {route.description}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${diff.color}22`, color: diff.color, border: `1px solid ${diff.color}44` }}
          >
            <DiffIcon className="w-3 h-3" />
            {diff.label}
          </span>
          {route.durationDays != null && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              {daysLabel(route.durationDays)}
            </span>
          )}
        </div>
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
