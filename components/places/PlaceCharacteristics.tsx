'use client';

import { Mountain, Layers, TrendingUp, MapPin, Users, Footprints, AlertTriangle, Stethoscope } from 'lucide-react';
import { LOCATION_TYPE_LABELS, DIFFICULTY_LABELS, HAZARD_LABELS } from './types';
import type { PlaceSafety } from './types';

interface Props {
  locationType: string | null;
  zone: string | null;
  safety: PlaceSafety;
  terrainType?: string | null;
}

const ZONE_LABELS: Record<string, string> = {
  avachinsky:    'Авачинский',
  mutnovsky:     'Мутновский',
  klyuchevsky:   'Ключевская группа',
  nalychevo:     'Налычево',
  kronotsky:     'Кроноцкий',
  southern:      'Южная Камчатка',
  central:       'Центральная',
  northern:      'Северная',
  petropavlovsk: 'Петропавловск',
  commander:     'Командорские о-ва',
};

const DIFFICULTY_COLOR: Record<number, string> = {
  1: 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/25',
  2: 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/25',
  3: 'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/25',
  4: 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/25',
  5: 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/25',
};

interface Stat { icon: React.ReactNode; label: string; value: string; color?: string }

export default function PlaceCharacteristics({ locationType, zone, safety, terrainType }: Props) {
  const stats: Stat[] = [];

  stats.push({
    icon: <Layers className="w-4 h-4" />,
    label: 'Тип',
    value: LOCATION_TYPE_LABELS[locationType ?? 'other'] ?? 'Место',
  });

  if (safety.altitudeM != null) {
    stats.push({
      icon: <Mountain className="w-4 h-4" />,
      label: 'Высота',
      value: `${safety.altitudeM.toLocaleString('ru-RU')} м`,
    });
  }

  if (safety.difficultyLevel != null) {
    const d = safety.difficultyLevel;
    stats.push({
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Сложность',
      value: DIFFICULTY_LABELS[d] ?? String(d),
      color: DIFFICULTY_COLOR[d],
    });
  }

  if (zone) {
    stats.push({
      icon: <MapPin className="w-4 h-4" />,
      label: 'Район',
      value: ZONE_LABELS[zone] ?? zone,
    });
  }

  if (terrainType) {
    stats.push({
      icon: <Footprints className="w-4 h-4" />,
      label: 'Рельеф',
      value: terrainType,
    });
  }

  if (safety.capacityPerDay != null) {
    stats.push({
      icon: <Users className="w-4 h-4" />,
      label: 'Вместимость',
      value: `${safety.capacityPerDay} чел/день`,
    });
  }

  if (safety.nearestMedicalKm != null) {
    stats.push({
      icon: <Stethoscope className="w-4 h-4" />,
      label: 'До медпомощи',
      value: `${safety.nearestMedicalKm} км`,
    });
  }

  const topHazards = safety.hazardTypes.slice(0, 6);

  if (stats.length === 0 && topHazards.length === 0) return null;

  return (
    <section className="mt-4">
      {/* Stat pills — horizontal scroll */}
      {stats.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto px-4 pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm
                ${s.color ?? 'text-[var(--text-primary)] bg-[var(--bg-card)] border-[var(--border)]'}`}
            >
              <span className="text-[var(--text-muted)]">{s.icon}</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">
                {s.label}
              </span>
              <span className="font-semibold whitespace-nowrap">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hazard chips */}
      {topHazards.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 mt-3">
          {topHazards.map(h => {
            const info = HAZARD_LABELS[h] ?? { label: h };
            return (
              <span
                key={h}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/25"
              >
                <AlertTriangle className="w-3 h-3" />
                {info.label}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
