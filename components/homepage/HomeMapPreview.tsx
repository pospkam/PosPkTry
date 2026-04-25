'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Filter } from 'lucide-react';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

type KindValue = 'place' | 'route' | 'tour';

const KIND_TABS: { value: KindValue; label: string }[] = [
  { value: 'place', label: 'Места' },
  { value: 'route', label: 'Маршруты' },
  { value: 'tour', label: 'Туры' },
];

// Сложные фильтры: группа → опции
const FILTER_GROUPS: Record<KindValue, { group: string; options: { id: string; label: string; queryParam?: string }[] }[]> = {
  place: [
    { group: 'Тип', options: [
      { id: 'volcano', label: 'Вулканы' },
      { id: 'hot_spring', label: 'Источники' },
      { id: 'bay', label: 'Океан' },
      { id: 'lake', label: 'Озёра' },
      { id: 'waterfall', label: 'Водопады' },
      { id: 'viewpoint', label: 'Смотровые' },
      { id: 'geyser', label: 'Гейзеры' },
    ]},
    { group: 'Район', options: [
      { id: 'avacha', label: 'Авачинская' },
      { id: 'mutnovsky', label: 'Мутновская' },
      { id: 'nalychevo', label: 'Налычево' },
      { id: 'bystrinsky', label: 'Быстринский' },
    ]},
  ],
  route: [
    { group: 'Тип', options: [
      { id: 'trekking', label: 'Пешие' },
      { id: 'dzhip', label: 'Джип' },
      { id: 'boat_trip', label: 'Водные' },
      { id: 'helicopter', label: 'Вертолёт' },
      { id: 'snowmobile', label: 'Снегоход' },
    ]},
    { group: 'Сложность', options: [
      { id: 'easy', label: 'Лёгкий' },
      { id: 'medium', label: 'Средний' },
      { id: 'hard', label: 'Сложный' },
    ]},
  ],
  tour: [
    { group: 'Категория', options: [
      { id: 'vulkani', label: 'Вулканы' },
      { id: 'rybalka', label: 'Рыбалка' },
      { id: 'medvedi', label: 'Медведи' },
      { id: 'vertoletnye_tury', label: 'Вертолёты' },
      { id: 'termalnye_istochniki', label: 'Источники' },
    ]},
    { group: 'Сезон', options: [
      { id: 'summer', label: 'Лето' },
      { id: 'winter', label: 'Зима' },
      { id: 'year_round', label: 'Круглый год' },
    ]},
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
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filteredRoutes, setFilteredRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Сброс фильтра при смене таба
  useEffect(() => { setActiveFilter(null); setFilteredRoutes([]); }, [kind]);

  // Загружаем точки только при выборе фильтра
  useEffect(() => {
    if (!activeFilter) { setFilteredRoutes([]); return; }
    setLoading(true);
    fetch(`/api/routes?hasCoords=true&limit=200&sort=title&kind=${kind}&activity_type=${activeFilter}`)
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
        setFilteredRoutes(points);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeFilter, kind]);

  const currentGroups = FILTER_GROUPS[kind] ?? FILTER_GROUPS.place;

  const markers = useMemo(() => filteredRoutes.map(r => ({
    id: r.id,
    coords: [r.lat, r.lng] as [number, number],
    title: r.title,
    description: '',
    color: COLOR_MAP[r.locationType ?? 'other'] ?? 'gray',
    href: `/routes/${r.id}`,
    type: MarkerType.POI,
    suppressBalloon: true,
  })), [filteredRoutes]);

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

      {/* Filter groups */}
      <div className="px-3 py-1.5 border-b border-[var(--border)] space-y-1.5">
        {currentGroups.map(group => (
          <div key={group.group} className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)] font-medium whitespace-nowrap">{group.group}:</span>
            <div className="flex gap-1.5 overflow-x-auto flex-1 pb-0.5">
              {group.options.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeFilter === f.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-[var(--text-muted)]">
            {activeFilter ? (loading ? 'Загрузка…' : `Найдено: ${filteredRoutes.length}`) : 'Выберите фильтр'}
          </span>
          {activeFilter && (
            <button onClick={() => setActiveFilter(null)} className="text-[10px] text-[var(--accent)] hover:opacity-75">
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: '380px' }}>
        <LeafletMap
          center={[53.0444, 158.6483]}
          zoom={7}
          markers={markers}
          height="380px"
          attribution={false}
        />
        {!activeFilter && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)] z-[400]">
            <div className="text-center">
              <Filter className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">Выберите фильтр чтобы увидеть точки</p>
            </div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/60 z-[400]">
            <div className="text-xs text-[var(--text-muted)]">Загрузка…</div>
          </div>
        )}
      </div>


    </div>
  );
}
