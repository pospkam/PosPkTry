'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart, MapPin, Flame, Wind, Thermometer, Droplets,
  Mountain, Waves, Anchor, TreePine, Landmark, Eye,
  Home, Globe, ExternalLink,
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

const LOCATION_COLORS: Record<string, string> = {
  volcano:    'var(--accent)',
  geyser:     'var(--warning)',
  hot_spring: 'var(--ocean)',
  thermal:    'var(--ocean)',
  lake:       'var(--ocean)',
  mountain:   'var(--text-secondary)',
  river:      'var(--ocean)',
  bay:        'var(--ocean)',
  beach:      'var(--success)',
  forest:     'var(--success)',
  museum:     'var(--text-secondary)',
  historical: 'var(--text-secondary)',
  rock:       'var(--text-muted)',
  viewpoint:  'var(--ocean)',
  settlement: 'var(--text-muted)',
  other:      'var(--text-muted)',
};

const CARD_IMAGES: Record<string, string> = {
  vulkani:              '/images/bento/mutnovsky.jpg',
  geyzery:              '/images/bento/mutnovsky.jpg',
  termalnye_istochniki: '/images/bento/paratunka.jpg',
  morskie_progulki:     '/images/activities/sea.jpg',
  mountains:            '/images/gallery/stela.jpg',
  eco:                  '/images/gallery/aurora.jpg',
  rybalka:              '/images/activities/fishing.jpg',
  rivers:               '/images/bento/khalaktyr.jpg',
  lakes:                '/images/gallery/bay-sunset.jpg',
  historical:           '/images/gallery/stela.jpg',
  monument:             '/images/gallery/stela.jpg',
  nature_reserve:       '/images/gallery/camp-sunset.jpg',
  geo:                  '/images/bento/mutnovsky.jpg',
  museum:               '/images/partners/kamchatintour/about1.jpg',
};

export default function PlaceCard({ route }: { route: RouteItem }) {
  const locType = route.locationType ?? 'other';
  const Icon    = LOCATION_ICONS[locType] ?? MapPin;
  const color   = LOCATION_COLORS[locType] ?? 'var(--text-muted)';
  const label   = LOCATION_LABELS[locType] ?? 'Место';
  const image   = CARD_IMAGES[route.category] ?? '/images/hero/hero-dark.jpg';

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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Тип локации — левый верх */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)]">
          <Icon className="w-3 h-3" style={{ color }} />
          {label}
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

        {/* Координаты — правый низ */}
        {route.lat != null && (
          <span className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-[var(--bg-card)]/80 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-[var(--ocean)]" />
          </span>
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
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
          {route.description}
        </p>
        {route.sourceUrl && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--ocean)] hover:underline">
            <Globe className="w-3 h-3" />
            {route.sourceName ?? 'Источник'}
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </span>
        )}
      </Link>
    </article>
  );
}
