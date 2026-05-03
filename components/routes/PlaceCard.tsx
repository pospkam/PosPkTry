'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart, MapPin, Flame, Wind, Thermometer, Droplets,
  Mountain, Waves, Anchor, TreePine, Landmark, Eye, Home,
} from 'lucide-react';
import type { RouteItem } from './RouteCard';

const LOCATION_LABELS: Record<string, string> = {
  volcano:    'Вулкан',
  geyser:     'Гейзерное поле',
  hot_spring: 'Термальный источник',
  thermal:    'Термальный источник',
  lake:       'Озеро',
  mountain:   'Горный массив',
  river:      'Река',
  bay:        'Бухта',
  beach:      'Пляж',
  forest:     'Природный парк',
  museum:     'Музей',
  historical: 'Историческое место',
  rock:       'Скала',
  viewpoint:  'Смотровая площадка',
  settlement: 'Населённый пункт',
  other:      'Место',
};

const LOCATION_ICONS: Record<string, React.ElementType> = {
  volcano:    Flame,
  geyser:     Wind,
  hot_spring: Thermometer,
  thermal:    Thermometer,
  lake:       Droplets,
  mountain:   Mountain,
  river:      Waves,
  bay:        Anchor,
  beach:      Waves,
  forest:     TreePine,
  museum:     Landmark,
  historical: Landmark,
  rock:       MapPin,
  viewpoint:  Eye,
  settlement: Home,
  other:      MapPin,
};

const PLACEHOLDER_BG: Record<string, string> = {
  volcano:    'linear-gradient(135deg, #7c2d12 0%, #991b1b 100%)',
  geyser:     'linear-gradient(135deg, #78350f 0%, #44403c 100%)',
  hot_spring: 'linear-gradient(135deg, #0e7490 0%, #0c4a6e 100%)',
  thermal:    'linear-gradient(135deg, #0e7490 0%, #0c4a6e 100%)',
  lake:       'linear-gradient(135deg, #1e3a5f 0%, #0c4a6e 100%)',
  mountain:   'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
  river:      'linear-gradient(135deg, #1d4ed8 0%, #0c4a6e 100%)',
  bay:        'linear-gradient(135deg, #075985 0%, #0c4a6e 100%)',
  beach:      'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
  forest:     'linear-gradient(135deg, #14532d 0%, #166534 100%)',
  museum:     'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
  historical: 'linear-gradient(135deg, #44403c 0%, #292524 100%)',
  other:      'linear-gradient(135deg, #292524 0%, #1c1917 100%)',
};

export default function PlaceCard({ route }: { route: RouteItem }) {
  const locType = route.locationType ?? 'other';
  const Icon    = LOCATION_ICONS[locType] ?? MapPin;
  const label   = LOCATION_LABELS[locType] ?? 'Место';

  const photoSrc = route.hasAiImage
    ? `/api/images/route/${route.id}`
    : (route.imageUrl ?? null);

  const placeholderBg = PLACEHOLDER_BG[locType] ?? PLACEHOLDER_BG.other;

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
    <article className="group rounded-lg border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden hover:border-[var(--accent)]/30 transition-colors duration-200">

      {/* ── Photo ─────────────────────────────────────────── */}
      <Link href={`/places/${route.id}`} className="block relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={route.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: placeholderBg }}
          >
            <Icon className="w-12 h-12 text-white opacity-20" />
          </div>
        )}
        {/* Type badge */}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <Icon className="w-3 h-3" />
          {label}
        </span>
      </Link>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="p-3 flex items-start gap-2">
        <Link href={`/places/${route.id}`} className="flex-1 min-w-0">
          <h3
            className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors text-sm"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {route.title}
          </h3>
          {route.lat != null && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <MapPin className="w-3 h-3" />
              На карте
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={handleFavorite}
          aria-label={liked ? 'В избранном' : 'В избранное'}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 mt-0.5"
          style={{ background: liked ? 'var(--accent)' : 'var(--bg-hover)', opacity: liking ? 0.5 : 1 }}
        >
          <Heart
            className="w-3 h-3 transition-all"
            style={{ color: liked ? 'var(--bg-card)' : 'var(--text-secondary)', fill: liked ? 'var(--bg-card)' : 'none' }}
          />
        </button>
      </div>
    </article>
  );
}
