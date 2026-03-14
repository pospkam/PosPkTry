'use client';

import { useState, useEffect } from 'react';
import Logo from '@/components/shared/Logo';
import Link from 'next/link';
import { Sun, Moon, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import YandexMap from '@/components/shared/YandexMap';
import BottomNav from '@/components/shared/BottomNav';

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
  const { isDark, toggleTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState<ActivityType>('all');
  const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch('/api/routes?hasCoords=true&limit=900&sort=title');
        const data = await res.json();
        if (!data.success) return;
        const markers: Marker[] = (data.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: { id: string; title: string; description: string; category: string; lat: number; lng: number }) => {
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

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Стандартный хедер */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo size={28} />
          </Link>
          <h1 className="text-lg font-bold text-[var(--text-primary)] hidden sm:block">Карта Камчатки</h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/profile" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Личный кабинет">
              <User size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Фильтры активностей */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-xl font-medium transition-all text-sm whitespace-nowrap ${
                activeFilter === filter.id
                  ? 'bg-[var(--accent)] text-[var(--bg-card)] shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {filter.name}
              <span className={`ml-1.5 text-xs ${
                activeFilter === filter.id ? 'text-[var(--bg-card)]/60' : 'text-[var(--text-muted)]'
              }`}>
                ({loading ? '…' : countFor(filter.id)})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Карта */}
      <div className="px-4 pb-4">
        <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
          <YandexMap
            center={[53.0444, 158.6483]}
            zoom={8}
            markers={filteredMarkers}
            height="calc(100vh - 200px)"
            className=""
          />

          {/* Счётчик точек */}
          <div className="absolute bottom-4 left-4 z-40 bg-black/60 rounded-xl px-4 py-2 border border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)]">
              {loading
                ? 'Загрузка маршрутов...'
                : <><span>Показано точек: </span><span className="font-bold text-[var(--accent)]">{filteredMarkers.length}</span></>
              }
            </p>
          </div>
        </div>
      </div>

      <BottomNav activePath="/map" />
    </div>
  );
}
