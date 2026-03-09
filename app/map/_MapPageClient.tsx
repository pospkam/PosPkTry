'use client';

import { useState, useEffect } from 'react';
import YandexMap from '@/components/shared/YandexMap';
import Link from 'next/link';

type ActivityType = 'all' | 'volcano' | 'nature' | 'geyser' | 'ocean' | 'thermal' | 'wildlife' | 'trekking' | 'heli' | 'winter';

interface Marker {
  coords: [number, number];
  title: string;
  description: string;
  activity: ActivityType;
  color: string;
}

// Map DB category slugs → UI activity type + color
const CATEGORY_MAP: Record<string, { activity: ActivityType; color: string }> = {
  vulkani:               { activity: 'volcano',  color: 'orange' },
  geyzery:               { activity: 'geyser',   color: 'green' },
  termalnye_istochniki:  { activity: 'thermal',  color: 'red' },
  morskie_progulki:      { activity: 'ocean',    color: 'blue' },
  rybalka:               { activity: 'nature',   color: 'blue' },
  medvedi:               { activity: 'wildlife', color: 'brown' },
  trekking:              { activity: 'trekking', color: 'green' },
  vertoletnye_tury:      { activity: 'heli',     color: 'purple' },
  snegohod:              { activity: 'winter',   color: 'cyan' },
  dzhip:                 { activity: 'nature',   color: 'gray' },
  lakes:                 { activity: 'nature',   color: 'blue' },
  mountains:             { activity: 'trekking', color: 'gray' },
  rivers:                { activity: 'nature',   color: 'blue' },
  eco:                   { activity: 'nature',   color: 'green' },
};

const ACTIVITY_FILTERS: Array<{ id: ActivityType; name: string }> = [
  { id: 'all',      name: 'Все точки' },
  { id: 'volcano',  name: 'Вулканы' },
  { id: 'nature',   name: 'Природа' },
  { id: 'geyser',   name: 'Гейзеры' },
  { id: 'ocean',    name: 'Океан' },
  { id: 'thermal',  name: 'Термальные' },
  { id: 'wildlife', name: 'Животные' },
  { id: 'trekking', name: 'Треккинг' },
  { id: 'heli',     name: 'Вертолёт' },
  { id: 'winter',   name: 'Зима' },
];

export default function MapPageClient() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ActivityType>('all');
  const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch('/api/kamchatka-routes?limit=500');
        const data = await res.json();
        if (!data.success) return;
        const markers: Marker[] = (data.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: { title: string; description: string; category: string; lat: number; lng: number }) => {
            const mapping = CATEGORY_MAP[r.category] ?? { activity: 'nature' as ActivityType, color: 'blue' };
            return {
              coords: [r.lat, r.lng] as [number, number],
              title: r.title,
              description: r.description ?? '',
              activity: mapping.activity,
              color: mapping.color,
            };
          });
        setAllMarkers(markers);
      } catch {
        // Keep empty on error
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  const filteredMarkers = activeFilter === 'all'
    ? allMarkers
    : allMarkers.filter(m => m.activity === activeFilter);

  const countFor = (activity: ActivityType) =>
    activity === 'all' ? allMarkers.length : allMarkers.filter(m => m.activity === activity).length;

  if (!isExpanded) {
    return (
      <div className="min-h-screen bg-black/90 flex items-center justify-center">
        <button
          onClick={() => setIsExpanded(true)}
          className="px-8 py-4 bg-premium-gold text-premium-black rounded-xl font-semibold hover:bg-premium-gold/80 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-shadow shadow-lg flex items-center gap-3"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Открыть карту
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0B1120]">
      {/* Панель управления */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">
              KamHub
            </Link>
            <span className="text-white/40">|</span>
            <h1 className="text-lg font-semibold text-white/90">Карта Камчатки</h1>
          </div>

          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white/80 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Свернуть карту</span>
          </button>
        </div>

        {/* Фильтры активностей */}
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === filter.id
                  ? 'bg-cyber-cyan text-black shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              }`}
            >
              {filter.name}
              <span className={`ml-2 text-xs ${
                activeFilter === filter.id ? 'text-white/70' : 'text-white/60'
              }`}>
                ({loading ? '…' : countFor(filter.id)})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Карта на весь экран */}
      <div className="absolute inset-0 pt-32">
        <YandexMap
          center={[53.0444, 158.6483]}
          zoom={8}
          markers={filteredMarkers}
          height="100%"
          className=""
        />
      </div>

      {/* Счетчик активных точек */}
      <div className="absolute bottom-4 left-4 z-40 bg-black/60 backdrop-blur-md rounded-lg shadow-lg px-4 py-2 border border-white/20">
        <p className="text-sm text-white/70">
          {loading
            ? 'Загрузка маршрутов...'
            : <><span>Показано точек: </span><span className="font-bold text-cyber-cyan">{filteredMarkers.length}</span></>
          }
        </p>
      </div>
    </div>
  );
}
