'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'volcano', label: 'Вулканы' },
  { id: 'hot_spring', label: 'Источники' },
  { id: 'bay', label: 'Океан' },
  { id: 'lake', label: 'Озёра' },
  { id: 'waterfall', label: 'Водопады' },
  { id: 'viewpoint', label: 'Смотровые' },
];

const COLOR_MAP: Record<string, string> = {
  volcano: 'orange',
  hot_spring: 'red',
  bay: 'darkCyan',
  lake: 'lightBlue',
  mountain: 'darkBlue',
  river: 'teal',
  geyser: 'green',
  waterfall: 'blue',
  viewpoint: 'cyan',
  rock: 'brown',
  island: 'purple',
  beach: 'orange',
  forest: 'darkGreen',
  other: 'gray',
};

interface RoutePoint {
  id: string;
  title: string;
  locationType: string | null;
  lat: number;
  lng: number;
}

export function HomeMapPreview() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [allRoutes, setAllRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/routes?hasCoords=true&limit=500&sort=title&kind=place')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => {
        const points = (d.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: { id: string; title: string; locationType: string | null; lat: number; lng: number }) => ({
            id: r.id,
            title: r.title,
            locationType: r.locationType ?? 'other',
            lat: r.lat,
            lng: r.lng,
          }));
        setAllRoutes(points);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    activeFilter === 'all'
      ? allRoutes
      : allRoutes.filter(r => r.locationType === activeFilter),
  [allRoutes, activeFilter]);

  const markers = useMemo(() => filtered.map(r => ({
    id: r.id,
    coords: [r.lat, r.lng] as [number, number],
    title: r.title,
    description: '',
    color: COLOR_MAP[r.locationType ?? 'other'] ?? 'gray',
    href: `/routes/${r.id}`,
    type: MarkerType.POI,
    suppressBalloon: true,
  })), [filtered]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      {/* Filter pills */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                activeFilter === f.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[var(--text-muted)] ml-2 flex-shrink-0">
          {loading ? '…' : filtered.length}
        </span>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: '260px' }}>
        <LeafletMap
          center={[53.0444, 158.6483]}
          zoom={7}
          markers={markers}
          height="260px"
          attribution={false}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/60 z-[400]">
            <div className="text-xs text-[var(--text-muted)]">Загрузка карты…</div>
          </div>
        )}
      </div>

      {/* Footer: link to full map */}
      <Link
        href="/map"
        className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors border-t border-[var(--border)]"
      >
        <MapPin className="w-3 h-3" />
        Открыть полную карту
      </Link>
    </div>
  );
}
