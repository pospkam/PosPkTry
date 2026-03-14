'use client';

import Link from 'next/link';
import {
  Flame, Thermometer, Anchor, Mountain, Leaf, Fish,
  Snowflake, Plane, Car, Waves, Droplets, Wind,
  Footprints, PawPrint, MapPin, Tag, Clock,
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

const DIFFICULTY_LABEL: Record<string, { label: string; color: string }> = {
  easy:     { label: 'Лёгкий',    color: 'var(--success)' },
  medium:   { label: 'Средний',   color: 'var(--warning)' },
  hard:     { label: 'Сложный',   color: 'var(--accent)' },
  extreme:  { label: 'Экстрим',   color: 'var(--danger)' },
};

export default function RouteCard({ route }: { route: RouteItem }) {
  const meta = CATEGORY_META[route.category] ?? {
    label: route.category, icon: MapPin, color: 'var(--text-secondary)'
  };
  const Icon = meta.icon;
  const diff = route.difficulty ? DIFFICULTY_LABEL[route.difficulty] : null;
  const hasGeo = route.lat != null && route.lng != null;
  const desc = route.description
    ? route.description.replace(/<[^>]+>/g, '').slice(0, 110).trimEnd() + (route.description.length > 110 ? '…' : '')
    : null;

  return (
    <Link
      href={`/routes/${route.id}`}
      className="group block bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--accent)]/40 hover:shadow-md transition-all duration-200"
    >
      {/* Category colour bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: meta.color }}
      />

      <div className="p-4 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 p-1.5 rounded-md flex-shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}
          >
            <Icon
              className="w-4 h-4"
              style={{ color: meta.color }}
            />
          </span>
          <h3 className="text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors duration-150 line-clamp-2">
            {route.title}
          </h3>
        </div>

        {/* Description */}
        {desc && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
            {desc}
          </p>
        )}

        {/* Footer badges */}
        <div className="mt-auto pt-2 flex flex-wrap items-center gap-1.5">
          {/* Category */}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              color: meta.color,
              backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
            }}
          >
            {meta.label}
          </span>

          {/* Price */}
          {route.priceFrom != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)]">
              <Tag className="w-2.5 h-2.5" />
              от {route.priceFrom.toLocaleString('ru-RU')} ₽
            </span>
          )}

          {/* Duration */}
          {route.durationDays != null && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-hover)]">
              <Clock className="w-2.5 h-2.5" />
              {route.durationDays} {pluralDays(route.durationDays)}
            </span>
          )}

          {/* Difficulty */}
          {diff && (
            <span
              className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ color: diff.color, backgroundColor: `color-mix(in srgb, ${diff.color} 10%, transparent)` }}
            >
              {diff.label}
            </span>
          )}

          {/* Geo pin */}
          {hasGeo && (
            <span className="ml-auto text-[var(--ocean)]" title="Есть координаты на карте">
              <MapPin className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function pluralDays(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}
