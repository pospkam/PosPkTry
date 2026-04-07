'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Heart, Flame, Thermometer, Anchor, Mountain, Leaf, Fish, Snowflake, Plane, Car, Wind, Footprints, PawPrint, MapPin, Waves, Droplets, Landmark, TreePine, Globe } from 'lucide-react';

export interface RouteItem {
  id: string;
  kind?: 'place' | 'tour' | 'route';
  imageUrl?: string;
  hasAiImage?: boolean;
  category: string;
  locationType?: string | null;
  activityType?: string | null;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  priceFrom: number | null;
  difficulty: string | null;
  durationDays: number | null;
  bestMonths?: number[] | null;
  offerCount?: number;
  topOperatorName?: string;
  minOfferPrice?: number | null;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; accent: string }> = {
  vulkani:              { label: 'Вулканы',             icon: Flame,       accent: 'var(--accent)' },
  termalnye_istochniki: { label: 'Термальные',          icon: Thermometer, accent: 'var(--ocean)' },
  morskie_progulki:     { label: 'Море',                icon: Anchor,      accent: 'var(--ocean)' },
  mountains:            { label: 'Горы',                icon: Mountain,    accent: 'var(--text-secondary)' },
  eco:                  { label: 'Эко',                 icon: Leaf,        accent: 'var(--success)' },
  rybalka:              { label: 'Рыбалка',             icon: Fish,        accent: 'var(--ocean)' },
  snegohod:             { label: 'Снегоходы',           icon: Snowflake,   accent: 'var(--ocean)' },
  vertoletnye_tury:     { label: 'Вертолёт',            icon: Plane,       accent: 'var(--accent)' },
  dzhip:                { label: 'Джип',                icon: Car,         accent: 'var(--text-secondary)' },
  trekking:             { label: 'Треккинг',            icon: Footprints,  accent: 'var(--success)' },
  geyzery:              { label: 'Гейзеры',             icon: Wind,        accent: 'var(--accent)' },
  rivers:               { label: 'Реки',                icon: Waves,       accent: 'var(--ocean)' },
  lakes:                { label: 'Озёра',               icon: Droplets,    accent: 'var(--ocean)' },
  medvedi:              { label: 'Медведи',             icon: PawPrint,    accent: 'var(--warning)' },
  historical:           { label: 'История',             icon: Landmark,    accent: 'var(--text-secondary)' },
  monument:             { label: 'Памятник',            icon: Landmark,    accent: 'var(--text-secondary)' },
  nature_reserve:       { label: 'Заповедник',          icon: TreePine,    accent: 'var(--success)' },
  'дикая_природа':      { label: 'Дикая природа',       icon: PawPrint,    accent: 'var(--success)' },
  geo:                  { label: 'Геология',            icon: Globe,       accent: 'var(--ocean)' },
};

function pluralTours(n: number) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'туров';
  if (mod10 === 1) return 'тур';
  if (mod10 >= 2 && mod10 <= 4) return 'тура';
  return 'туров';
}

import PlaceCard from './PlaceCard';
import RoutePathCard from './RoutePathCard';
import TourCard from './TourCard';

export default function RouteCard({ route }: { route: RouteItem }) {
  if (route.kind === 'place') return <PlaceCard route={route} />;
  if (route.kind === 'route') return <RoutePathCard route={route} />;
  if (route.kind === 'tour')  return <TourCard route={route} />;
  // fallback
  return <LegacyCard route={route} />;
}

function LegacyCard({ route }: { route: RouteItem }) {
  const meta = CATEGORY_META[route.category] ?? { label: route.category, icon: MapPin, accent: 'var(--accent)' };
  const Icon = meta.icon;
  const displayPrice = route.minOfferPrice ?? route.priceFrom;
  const hasOffers = (route.offerCount ?? 0) > 0;
  const isTourOrRoute = route.kind === 'tour' || route.kind === 'route';

  const currentMonth = new Date().getMonth() + 1;
  const isInSeason = route.bestMonths?.includes(currentMonth) ?? false;

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
          <Icon className="w-3 h-3" style={{ color: meta.accent }} />
          {meta.label}
        </span>
        <div className="flex items-center gap-2">
          {isInSeason && (
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" title="Сейчас сезон" />
          )}
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={liked ? 'В избранном' : 'В избранное'}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: liked ? 'var(--accent)' : 'var(--bg-hover)',
              opacity: liking ? 0.5 : 1,
            }}
          >
            <Heart
              className="w-3.5 h-3.5 transition-all"
              style={{
                color: liked ? 'var(--bg-card)' : 'var(--text-secondary)',
                fill: liked ? 'var(--bg-card)' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      <Link href={`/routes/${route.id}`} className="block space-y-1">
        <h3
          className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
          style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem' }}
        >
          {route.title}
        </h3>

        {displayPrice != null && displayPrice > 0 && (
          <span className="inline-flex text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-hover)] px-2 py-1 rounded">
            от {displayPrice.toLocaleString('ru-RU')} ₽
          </span>
        )}

        <div className="flex items-center justify-between">
          {isTourOrRoute ? (
            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
              {route.durationDays != null && <>{route.durationDays} {route.durationDays === 1 ? 'день' : route.durationDays < 5 ? 'дня' : 'дней'}</>}
              {route.durationDays != null && route.difficulty && <span className="mx-1">·</span>}
              {route.difficulty && <>{route.difficulty === 'easy' ? 'Легко' : route.difficulty === 'medium' ? 'Средне' : 'Сложно'}</>}
            </span>
          ) : hasOffers ? (
            <span className="text-xs text-[var(--success)] font-medium">
              {route.offerCount} {pluralTours(route.offerCount ?? 0)}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">
              {route.topOperatorName ?? 'Место'}
            </span>
          )}
          {route.lat != null && (
            <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
          )}
        </div>
      </Link>
    </article>
  );
}
