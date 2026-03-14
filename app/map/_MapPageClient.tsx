'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import dynamic from 'next/dynamic';
import Logo from '@/components/shared/Logo';
import BottomNav from '@/components/shared/BottomNav';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const CATEGORY_COLORS: Record<string, string> = {
  vulkani:              'orange',
  rybalka:              'blue',
  termalnye_istochniki: 'red',
  geyzery:              'green',
  morskie_progulki:     'darkCyan',
  trekking:             'darkGreen',
  vertoletnye_tury:     'purple',
  medvedi:              'brown',
  snegohod:             'cyan',
  dzhip:                'gray',
  lakes:                'lightBlue',
  mountains:            'darkBlue',
  rivers:               'teal',
  eco:                  'green',
};

const CATEGORY_FILTERS: Array<{ id: string; name: string }> = [
  { id: 'all',                  name: 'Все' },
  { id: 'vulkani',              name: 'Вулканы' },
  { id: 'termalnye_istochniki', name: 'Термальные' },
  { id: 'geyzery',              name: 'Гейзеры' },
  { id: 'morskie_progulki',     name: 'Океан' },
  { id: 'medvedi',              name: 'Медведи' },
  { id: 'trekking',             name: 'Трекинг' },
  { id: 'vertoletnye_tury',     name: 'Вертолёт' },
  { id: 'rybalka',              name: 'Рыбалка' },
  { id: 'snegohod',             name: 'Снегоходы' },
  { id: 'dzhip',                name: 'Джип-туры' },
  { id: 'lakes',                name: 'Озёра' },
  { id: 'mountains',            name: 'Горы' },
  { id: 'rivers',               name: 'Реки' },
  { id: 'eco',                  name: 'Экомаршруты' },
];

interface RoutePoint {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  description: string;
}

export default function MapPageClient() {
  const { isDark, toggleTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('all');
  const [allRoutes, setAllRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/routes?hasCoords=true&limit=900&sort=title');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;
        const points: RoutePoint[] = (data.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: { id: string; title: string; category: string; lat: number; lng: number; description: string }) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            lat: r.lat,
            lng: r.lng,
            description: r.description ?? '',
          }));
        setAllRoutes(points);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = activeFilter === 'all'
    ? allRoutes
    : allRoutes.filter(r => r.category === activeFilter);

  const countFor = (cat: string) =>
    cat === 'all' ? allRoutes.length : allRoutes.filter(r => r.category === cat).length;

  const mapMarkers = filtered.map(r => ({
    coords: [r.lat, r.lng] as [number, number],
    title: r.title,
    description: r.description.slice(0, 120),
    color: CATEGORY_COLORS[r.category] ?? 'blue',
  }));

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo size={28} />
          </Link>
          <h1 className="text-lg font-bold text-[var(--text-primary)] hidden sm:block"
              style={{ fontFamily: 'var(--font-playfair)' }}>
            Карта Камчатки
          </h1>
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

      {/* Filters — all 14 categories */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === f.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]'
              }`}
            >
              {f.name}
              <span className={`ml-1 text-xs ${activeFilter === f.id ? 'opacity-70' : 'text-[var(--text-muted)]'}`}>
                {loading ? '...' : countFor(f.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="px-4 pb-4">
        <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
          <LeafletMap
            center={[53.0444, 158.6483]}
            zoom={7}
            markers={mapMarkers}
            height="calc(100vh - 180px)"
            attribution={false}
          />

          {/* Counter */}
          <div className="absolute bottom-3 left-3 z-40 bg-[var(--bg-card)] rounded-lg px-3 py-1.5 border border-[var(--border)] shadow-sm">
            <p className="text-sm text-[var(--text-secondary)]">
              {loading
                ? 'Загрузка...'
                : <>Точек: <span className="font-bold text-[var(--accent)]">{filtered.length}</span></>
              }
            </p>
          </div>
        </div>
      </div>

      <BottomNav activePath="/map" />
    </div>
  );
}
