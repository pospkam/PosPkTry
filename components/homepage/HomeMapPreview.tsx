'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Filter, X } from 'lucide-react';
import { MarkerType, type MapMarker } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

type KindValue = 'place' | 'route' | 'tour';

const KIND_TABS: { value: KindValue; label: string }[] = [
  { value: 'place', label: 'Места' },
  { value: 'route', label: 'Маршруты' },
  { value: 'tour', label: 'Туры' },
];

// All filter options — flat list, no group labels
const FILTER_OPTIONS: Record<KindValue, { id: string; label: string; queryField?: string }[]> = {
  place: [
    { id: 'volcano', label: 'Вулканы', queryField: 'location_type' },
    { id: 'hot_spring', label: 'Источники', queryField: 'location_type' },
    { id: 'bay', label: 'Океан', queryField: 'location_type' },
    { id: 'lake', label: 'Озёра', queryField: 'location_type' },
    { id: 'waterfall', label: 'Водопады', queryField: 'location_type' },
    { id: 'viewpoint', label: 'Смотровые', queryField: 'location_type' },
    { id: 'geyser', label: 'Гейзеры', queryField: 'location_type' },
    { id: 'avacha', label: 'Авачинская', queryField: 'activity_type' },
    { id: 'mutnovsky', label: 'Мутновская', queryField: 'activity_type' },
    { id: 'nalychevo', label: 'Налычево', queryField: 'activity_type' },
    { id: 'bystrinsky', label: 'Быстринский', queryField: 'activity_type' },
  ],
  route: [
    { id: 'trekking', label: 'Пешие', queryField: 'activity_type' },
    { id: 'dzhip', label: 'Джип', queryField: 'activity_type' },
    { id: 'boat_trip', label: 'Водные', queryField: 'activity_type' },
    { id: 'helicopter', label: 'Вертолёт', queryField: 'activity_type' },
    { id: 'snowmobile', label: 'Снегоход', queryField: 'activity_type' },
    { id: 'easy', label: 'Лёгкий', queryField: 'difficulty' },
    { id: 'medium', label: 'Средний', queryField: 'difficulty' },
    { id: 'hard', label: 'Сложный', queryField: 'difficulty' },
  ],
  tour: [
    { id: 'vulkani', label: 'Вулканы', queryField: 'category' },
    { id: 'rybalka', label: 'Рыбалка', queryField: 'category' },
    { id: 'medvedi', label: 'Медведи', queryField: 'category' },
    { id: 'vertoletnye_tury', label: 'Вертолёты', queryField: 'category' },
    { id: 'termalnye_istochniki', label: 'Источники', queryField: 'category' },
    { id: 'summer', label: 'Лето', queryField: 'activity_type' },
    { id: 'winter', label: 'Зима', queryField: 'activity_type' },
    { id: 'year_round', label: 'Круглый год', queryField: 'activity_type' },
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
  difficulty: string | null;
  lat: number;
  lng: number;
  description: string;
}

export function HomeMapPreview() {
  const [kind, setKind] = useState<KindValue>('place');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filteredRoutes, setFilteredRoutes] = useState<RoutePoint[]>([]);
  const [allRoutes, setAllRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Загружаем все точки при смене таба
  useEffect(() => {
    setActiveFilter(null);
    setLoading(true);
    fetch(`/api/routes?hasCoords=true&limit=300&sort=title&kind=${kind}`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => {
        const points = (d.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: {
            id: string; title: string; kind: string; locationType: string | null;
            activityType: string | null; category: string | null; difficulty: string | null;
            description: string; lat: number; lng: number;
          }) => ({
            id: r.id,
            title: r.title,
            kind: r.kind,
            locationType: r.locationType ?? 'other',
            activityType: r.activityType ?? null,
            category: r.category ?? null,
            difficulty: r.difficulty ?? null,
            description: (r.description ?? '').replace(/<[^>]+>/g, '').slice(0, 120),
            lat: r.lat,
            lng: r.lng,
          }));
        setAllRoutes(points);
        setFilteredRoutes(points);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kind]);

  const currentOptions = FILTER_OPTIONS[kind] ?? FILTER_OPTIONS.place;

  // Фильтрация
  const applyFilter = useCallback((filterId: string) => {
    if (!filterId) { setFilteredRoutes(allRoutes); return; }
    const opt = currentOptions.find(o => o.id === filterId);
    if (!opt) { setFilteredRoutes(allRoutes); return; }
    const field = opt.queryField ?? 'location_type';
    const filtered = allRoutes.filter(r => {
      const val = field === 'location_type' ? r.locationType
        : field === 'activity_type' ? r.activityType
        : field === 'category' ? r.category
        : field === 'difficulty' ? r.difficulty
        : r.locationType;
      return val === filterId;
    });
    setFilteredRoutes(filtered);
  }, [allRoutes, currentOptions]);

  const handleFilterClick = useCallback((id: string) => {
    setActiveFilter(prev => {
      const next = prev === id ? null : id;
      applyFilter(next ?? '');
      return next;
    });
  }, [applyFilter]);

  const markers: MapMarker[] = useMemo(() => filteredRoutes.map(r => ({
    id: r.id,
    coords: [r.lat, r.lng] as [number, number],
    title: r.title,
    description: r.description,
    color: COLOR_MAP[r.locationType ?? 'other'] ?? 'gray',
    href: `/routes/${r.id}`,
    type: MarkerType.POI,
  })), [filteredRoutes]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] lg:border-l lg:border-b-0 border-b border-[var(--border)]">
      {/* Kind tabs */}
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

      {/* Single row of filter pills — no group labels */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] overflow-x-auto bg-[var(--bg-card)]">
        <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
        {currentOptions.map(f => (
          <button
            key={f.id}
            onClick={() => handleFilterClick(f.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              activeFilter === f.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {f.label}
          </button>
        ))}
        {activeFilter && (
          <button
            onClick={() => { setActiveFilter(null); setFilteredRoutes(allRoutes); }}
            className="flex-shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="text-[10px] text-[var(--text-muted)] ml-auto flex-shrink-0">
          {loading ? '…' : filteredRoutes.length}
        </span>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-[350px]">
        <LeafletMap
          center={[53.0444, 158.6483]}
          zoom={7}
          markers={markers}
          height="100%"
          attribution={false}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)] z-[400]">
            <div className="text-xs text-[var(--text-muted)]">Загрузка карты…</div>
          </div>
        )}
      </div>

      {/* Route cards below map */}
      {filteredRoutes.length > 0 && (
        <div className="bg-[var(--bg-primary)]">
          <div className="px-4 py-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">
            {filteredRoutes.length} {filteredRoutes.length === 1 ? 'объект' : filteredRoutes.length < 5 ? 'объекта' : 'объектов'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 px-4 pb-3">
            {filteredRoutes.slice(0, 8).map(r => (
              <a
                key={r.id}
                href={`/routes/${r.id}`}
                className="group block rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-2.5 hover:border-[var(--accent)] transition-colors"
              >
                <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] truncate">
                  {r.title}
                </p>
                {r.description && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                    {r.description}
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
