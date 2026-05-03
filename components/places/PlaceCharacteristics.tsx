'use client';

import { MapPin, Layers, TrendingUp, Users, AlertTriangle, Footprints } from 'lucide-react';
import { LOCATION_TYPE_LABELS, DIFFICULTY_LABELS, HAZARD_LABELS } from './types';
import type { PlaceSafety } from './types';

interface Props {
  locationType: string | null;
  zone: string | null;
  safety: PlaceSafety;
  terrainType?: string | null;
}

const ZONE_LABELS: Record<string, string> = {
  avachinsky:  'Авачинский район',
  mutnovsky:   'Мутновский район',
  klyuchevsky: 'Ключевская группа',
  nalychevo:   'Налычево',
  kronotsky:   'Кроноцкий заповедник',
  southern:    'Южная Камчатка',
  central:     'Центральная Камчатка',
  northern:    'Северная Камчатка',
  petropavlovsk: 'Петропавловск-Камчатский',
  commander:   'Командорские острова',
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'text-[var(--success)]',
  2: 'text-[var(--success)]',
  3: 'text-[var(--warning)]',
  4: 'text-[var(--accent)]',
  5: 'text-[var(--danger)]',
};

export default function PlaceCharacteristics({ locationType, zone, safety, terrainType }: Props) {
  const typeLabel  = LOCATION_TYPE_LABELS[locationType ?? 'other'] ?? 'Место';
  const diff       = safety.difficultyLevel;
  const diffLabel  = diff != null ? DIFFICULTY_LABELS[diff] ?? null : null;
  const diffColor  = diff != null ? (DIFFICULTY_COLORS[diff] ?? 'text-[var(--text-primary)]') : '';
  const zoneLabel  = zone ? (ZONE_LABELS[zone] ?? zone) : null;
  const topHazards = safety.hazardTypes.slice(0, 4);

  const items: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [];

  items.push({
    icon: <Layers className="w-4 h-4 text-[var(--ocean)]" />,
    label: 'Тип',
    value: <span className="font-semibold text-[var(--text-primary)]">{typeLabel}</span>,
  });

  if (safety.altitudeM != null) {
    items.push({
      icon: <TrendingUp className="w-4 h-4 text-[var(--ocean)]" />,
      label: 'Высота',
      value: <span className="font-semibold text-[var(--text-primary)]">{safety.altitudeM.toLocaleString('ru-RU')} м</span>,
    });
  }

  if (diffLabel) {
    items.push({
      icon: <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />,
      label: 'Сложность',
      value: <span className={`font-semibold ${diffColor}`}>{diffLabel}</span>,
    });
  }

  if (zoneLabel) {
    items.push({
      icon: <MapPin className="w-4 h-4 text-[var(--accent)]" />,
      label: 'Район',
      value: <span className="font-semibold text-[var(--text-primary)]">{zoneLabel}</span>,
    });
  }

  if (safety.capacityPerDay != null) {
    items.push({
      icon: <Users className="w-4 h-4 text-[var(--ocean)]" />,
      label: 'Вместимость',
      value: <span className="font-semibold text-[var(--text-primary)]">{safety.capacityPerDay} чел/день</span>,
    });
  }

  if (terrainType) {
    items.push({
      icon: <Footprints className="w-4 h-4 text-[var(--ocean)]" />,
      label: 'Рельеф',
      value: <span className="font-semibold text-[var(--text-primary)]">{terrainType}</span>,
    });
  }

  if (items.length === 0 && topHazards.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-4">
      <div className="ds-card p-5 space-y-4">
        {/* Grid of facts */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((item, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] uppercase tracking-wide">
                  {item.icon}
                  {item.label}
                </div>
                <div className="text-sm">{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Key hazards as compact badges */}
        {topHazards.length > 0 && (
          <>
            {items.length > 0 && <div className="border-t border-[var(--border)]" />}
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">Что важно знать</p>
              <div className="flex flex-wrap gap-2">
                {topHazards.map(h => {
                  const info = HAZARD_LABELS[h] ?? { label: h };
                  return (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border)]"
                    >
                      <AlertTriangle className="w-3 h-3 text-[var(--warning)]" />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
