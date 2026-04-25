'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

type KindValue = 'place' | 'route' | 'tour';

const KIND_TABS: { value: KindValue; label: string }[] = [
  { value: 'place', label: 'Места' },
  { value: 'route', label: 'Маршруты' },
  { value: 'tour', label: 'Туры' },
];

const FILTERS: Record<KindValue, { id: string; label: string }[]> = {
  place: [
    { id: 'all', label: 'Все' },
    { id: 'volcano', label: 'Вулканы' },
    { id: 'hot_spring', label: 'Источники' },
    { id: 'bay', label: 'Океан' },
    { id: 'lake', label: 'Озёра' },
    { id: 'waterfall', label: 'Водопады' },
    { id: 'viewpoint', label: 'Смотровые' },
  ],
  route: [
    { id: 'all', label: 'Все' },
    { id: 'trekking', label: 'Пешие' },
    { id: 'dzhip', label: 'Джип' },
    { id: 'boat_trip', label: 'Водные' },
  ],
  tour: [
    { id: 'all', label: 'Все' },
    { id: 'vulkani', label: 'Вулканы' },
    { id: 'rybalka', label: 'Рыбалка' },
    { id: 'medvedi', label: 'Медведи' },
    { id: 'vertoletnye_tury', label: 'Вертолёты' },
  ],
};

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
  kind: string;
  locationType: string | null;
  activityType: string | null;
  category: string | null;
  lat: number;
  lng: number;
}

export function HomeMapPreview() {
  const [kind, setKind] = useState<KindValue>('place');
  const [activeFilter, setActiveFilter] = useState('all');
  const [allRoutes, setAllRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset filter when kind changes
  useEffect(() => { setActiveFilter('all'); }, [kind]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/routes?hasCoords=true&limit=500&sort=title&kind=${kind}`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => {
        const points = (d.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: { id: string; title: string; kind: string; locationType: string | null; activityType: string | null; category: string | null; lat: number; lng: number }) => ({
            id: r.id,
            title: r.title,
            kind: r.kind,
            locationType: r.locationType ?? 'other',
            activityType: r.activityType ?? null,
            category: r.category ?? null,
            lat: r.lat,
            lng: r.lng,
          }));
        setAllRoutes(points);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kind]);

  const currentFilters = FILTERS[kind] ?? FILTERS.place;

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return allRoutes;
    switch (kind) {
      case 'place':
        return allRoutes.filter(r => r.locationType === activeFilter);
      case 'route':
        return allRoutes.filter(r => r.activityType === activeFilter);
      case 'tour':
        return allRoutes.filter(r => r.category === activeFilter);
      default:
        return allRoutes;
    }
  }, [allRoutes, activeFilter, kind]);

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
      {/* Kind tabs: Места / Маршруты / Туры */}
      <div className="flex border-b border-[var(--border)]">
        {KIND_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setKind(t.value)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              kind === t.value
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
        <div className="flex gap-1.5 overflow-x-auto">
          {currentFilters.map(f => (
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
      <div className="relative" style={{ height: '240px' }}>
        <LeafletMap
          center={[53.0444, 158.6483]}
          zoom={7}
          markers={markers}
          height="240px"
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
