'use client';

/**
 * OnSiteBanner — верхняя панель для режима «Я на Камчатке».
 * Показывает: координаты, район, кнопку SOS заметнее.
 * Рендерится на главной когда geo mode === 'on-site'.
 */

import { MapPin, Compass, AlertTriangle } from 'lucide-react';
import { useGeo } from '@/contexts/GeoContext';

export function OnSiteBanner() {
  const { mode, location, region, disableOnSite } = useGeo();

  if (mode !== 'on-site' || !location) return null;

  return (
    <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Location dot */}
          <div className="w-8 h-8 rounded-full bg-[var(--success)]/15 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-[var(--success)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              Привет, ты {region}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              {location.accuracy < 100
                ? ` (±${Math.round(location.accuracy)}м)`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick SOS */}
          <a
            href="/hub/safety"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs font-medium hover:bg-[var(--danger)]/20 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            SOS
          </a>
          {/* Exit mode */}
          <button
            onClick={disableOnSite}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] text-xs hover:text-[var(--text-primary)] transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            Планирую
          </button>
        </div>
      </div>
    </div>
  );
}
