'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Heart, Flame, Thermometer, Anchor, Mountain, Leaf, Fish, Snowflake, Plane, Car, Wind, Footprints, PawPrint, MapPin, Waves, Droplets, Landmark, TreePine, Globe } from 'lucide-react';

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
  historical:           '/images/gallery/stela.jpg',
  monument:             '/images/gallery/stela.jpg',
  nature_reserve:       '/images/gallery/camp-sunset.jpg',
  'дикая_природа':      '/images/gallery/road-winter.jpg',
  geo:                  '/images/bento/mutnovsky.jpg',
};

function pluralTours(n: number) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'туров';
  if (mod10 === 1) return 'тур';
  if (mod10 >= 2 && mod10 <= 4) return 'тура';
  return 'туров';
}

export default function RouteCard({ route }: { route: RouteItem }) {
  const meta = CATEGORY_META[route.category] ?? { label: route.category, icon: MapPin, accent: 'var(--accent)' };
  const Icon = meta.icon;
  const image = CARD_IMAGES[route.category] ?? '/images/bento/mutnovsky.jpg';
  const displayPrice = route.minOfferPrice ?? route.priceFrom;
  const hasOffers = (route.offerCount ?? 0) > 0;

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
    <article className="group">
      {/* ── Фото ─────────────────────────────────────────────────────────────── */}
      <Link href={`/routes/${route.id}`} className="block relative overflow-hidden rounded-lg" style={{ aspectRatio: '3/4' }}>
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={route.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        </>

        {/* Категория — левый верх */}
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)]"
        >
          <Icon className="w-3 h-3" style={{ color: meta.accent }} />
          {meta.label}
        </span>

        {/* Сезон — точка */}
        {isInSeason && (
          <span
            className="absolute top-3.5 left-3 translate-x-[calc(100%+1.75rem)] w-2 h-2 rounded-full bg-[var(--success)]"
            title="Сейчас сезон"
          />
        )}

        {/* Избранное — правый верх */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={liked ? 'В избранном' : 'В избранное'}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background: liked ? 'var(--accent)' : 'var(--bg-card)',
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

        {/* Цена поверх градиента — левый низ */}
        {displayPrice != null && displayPrice > 0 && (
          <span className="absolute bottom-3 left-3 text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-card)] px-2 py-0.5 rounded leading-none">
            от {displayPrice.toLocaleString('ru-RU')} ₽
          </span>
        )}
      </Link>

      {/* ── Текст ──────────────────────────────────────────────────────────────── */}
      <Link href={`/routes/${route.id}`} className="block mt-3 space-y-1">
        <h3
          className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
          style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem' }}
        >
          {route.title}
        </h3>

        <div className="flex items-center justify-between">
          {hasOffers ? (
            <span className="text-xs text-[var(--success)] font-medium">
              {route.offerCount} {pluralTours(route.offerCount ?? 0)}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">
              {route.topOperatorName ?? 'Без туров'}
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
