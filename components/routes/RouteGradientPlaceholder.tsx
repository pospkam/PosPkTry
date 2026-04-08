'use client';
/**
 * RouteGradientPlaceholder
 *
 * CSS-градиентный плейсхолдер для маршрутов без фотографий.
 * Заменяет "локальную diffusion модель" — визуально богатый,
 * мгновенный, без внешних API.
 */

import { Mountain, Fish, PawPrint, Snowflake, Anchor, Plane, Car, Compass } from 'lucide-react';
import type { ReactNode } from 'react';

interface GradientConfig {
  gradient: string;
  icon: ReactNode;
  label: string;
}

const ACTIVITY_GRADIENTS: Record<string, GradientConfig> = {
  fishing:    { gradient: 'from-[#1a3a5c] via-[#2568B0] to-[#0a2240]',  icon: <Fish    size={48} />, label: 'Рыбалка' },
  trekking:   { gradient: 'from-[#2d1b00] via-[#8B5E3C] to-[#1a3a1a]',  icon: <Mountain size={48} />, label: 'Трекинг' },
  volcano:    { gradient: 'from-[#3d0a00] via-[#D44A0C] to-[#1a1a00]',  icon: <Mountain size={48} />, label: 'Вулканы' },
  bears:      { gradient: 'from-[#1a1a0a] via-[#4a3520] to-[#0d2200]',  icon: <PawPrint size={48} />, label: 'Медведи' },
  winter:     { gradient: 'from-[#0a1a2a] via-[#1e4060] to-[#001a3d]',  icon: <Snowflake size={48} />, label: 'Зима' },
  diving:     { gradient: 'from-[#001a2e] via-[#003d5c] to-[#000d1a]',  icon: <Anchor   size={48} />, label: 'Дайвинг' },
  helicopter: { gradient: 'from-[#0d1a2e] via-[#2568B0] to-[#3d1a0d]',  icon: <Plane    size={48} />, label: 'Вертолёт' },
  offroad:    { gradient: 'from-[#1a1a00] via-[#4a4520] to-[#0d1a00]',  icon: <Car      size={48} />, label: 'Внедорожник' },
};

const LOCATION_GRADIENTS: Record<string, GradientConfig> = {
  volcano:   ACTIVITY_GRADIENTS.volcano,
  sea:       ACTIVITY_GRADIENTS.diving,
  river:     ACTIVITY_GRADIENTS.fishing,
  forest:    { gradient: 'from-[#0d1a0d] via-[#1a3d1a] to-[#0a2a0a]',  icon: <Mountain size={48} />, label: 'Тайга' },
  thermal:   { gradient: 'from-[#2a0d00] via-[#8B3A0C] to-[#1a0a1a]',  icon: <Compass  size={48} />, label: 'Термальные' },
  mountain:  ACTIVITY_GRADIENTS.trekking,
  other:     { gradient: 'from-[#1a1a1a] via-[#2d2d2d] to-[#0d0d0d]',  icon: <Compass  size={48} />, label: 'Маршрут' },
};

function resolve(activityType?: string | null, locationType?: string | null): GradientConfig {
  if (activityType) {
    const key = activityType.toLowerCase();
    const match = Object.entries(ACTIVITY_GRADIENTS).find(([k]) => key.includes(k));
    if (match) return match[1];
  }
  if (locationType) {
    const key = locationType.toLowerCase();
    return LOCATION_GRADIENTS[key] ?? LOCATION_GRADIENTS.other;
  }
  return LOCATION_GRADIENTS.other;
}

interface Props {
  title: string;
  activityType?: string | null;
  locationType?: string | null;
  className?: string;
  showLabel?: boolean;
}

export function RouteGradientPlaceholder({ title, activityType, locationType, className = '', showLabel = true }: Props) {
  const cfg = resolve(activityType, locationType);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${cfg.gradient} ${className}`}>
      {/* Фоновый текстурный слой */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
      />

      {/* Большая иконка */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 text-white">
        <div className="scale-[3]">{cfg.icon}</div>
      </div>

      {/* Контент */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3 p-6 text-white text-center">
        <div className="opacity-70">{cfg.icon}</div>
        {showLabel && (
          <span className="text-xs font-medium uppercase tracking-widest opacity-50">
            {cfg.label}
          </span>
        )}
        <p className="font-playfair text-lg font-bold leading-tight max-w-xs opacity-90 line-clamp-3">
          {title}
        </p>
      </div>
    </div>
  );
}
