'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Map, LayoutGrid, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import RouteCard, { type RouteItem } from '@/components/routes/RouteCard';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';

const YandexMap = dynamic(() => import('@/components/shared/YandexMap'), { ssr: false });

const CATEGORIES = [
  { value: '',                   label: 'Все' },
  { value: 'vulkani',            label: 'Вулканы' },
  { value: 'termalnye_istochniki', label: 'Термальные' },
  { value: 'eco',                label: 'Экомаршруты' },
  { value: 'morskie_progulki',   label: 'Море' },
  { value: 'trekking',           label: 'Трекинг' },
  { value: 'rybalka',            label: 'Рыбалка' },
  { value: 'mountains',          label: 'Горы' },
  { value: 'lakes',              label: 'Озёра' },
  { value: 'geyzery',            label: 'Гейзеры' },
  { value: 'rivers',             label: 'Реки' },
  { value: 'medvedi',            label: 'Медведи' },
  { value: 'snegohod',           label: 'Снегоходы' },
  { value: 'vertoletnye_tury',   label: 'Вертолёты' },
  { value: 'dzhip',              label: 'Джип-туры' },
];

const SORT_OPTIONS = [
  { value: 'title',  label: 'А — Я' },
  { value: 'price',  label: 'По цене' },
  { value: 'recent', label: 'Новые' },
];

const LIMIT = 24;

interface RoutesResponse {
  success: boolean;
  data: RouteItem[];
  meta: { total: number; page: number; pages: number };
}

interface MapRoute {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
}

export default function RoutesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [sort, setSort] = useState<'title' | 'price' | 'recent'>('title');
  const [page, setPage] = useState(1);

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [mapRoutes, setMapRoutes] = useState<MapRoute[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch grid data ──────────────────────────────────────────
  const fetchRoutes = useCallback(async (q: string, cat: string, pg: number, srt: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT), sort: srt });
    if (q) params.set('q', q);
    if (cat) params.set('category', cat);
    try {
      const res = await fetch(`/api/routes?${params}`);
      const json: RoutesResponse = await res.json();
      if (json.success) {
        setRoutes(json.data);
        setMeta({ total: json.meta.total, pages: json.meta.pages });
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  // ── Fetch map pins (all coords, no pagination) ───────────────
  const fetchMapRoutes = useCallback(async () => {
    setMapLoading(true);
    const params = new URLSearchParams({ limit: '500', hasCoords: 'true' });
    if (category) params.set('category', category);
    if (query) params.set('q', query);
    try {
      const res = await fetch(`/api/routes?${params}`);
      const json: RoutesResponse = await res.json();
      if (json.success) {
        setMapRoutes(
          (json.data as (RouteItem & { lat: number; lng: number })[])
            .filter(r => r.lat != null && r.lng != null)
            .map(r => ({ id: r.id, title: r.title, category: r.category, lat: r.lat, lng: r.lng }))
        );
      }
    } catch { /* silent */ }
    setMapLoading(false);
  }, [category, query]);

  // ── Initial + param-driven load ──────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRoutes(query, category, page, sort);
    }, query ? 300 : 0);
  }, [query, category, page, sort, fetchRoutes]);

  useEffect(() => {
    if (view === 'map') fetchMapRoutes();
  }, [view, fetchMapRoutes]);

  // ── Sync URL ─────────────────────────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (category) p.set('category', category);
    if (page > 1) p.set('page', String(page));
    router.replace(`/routes${p.size ? '?' + p : ''}`, { scroll: false });
  }, [query, category, page, router]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setQuery(val);
    setPage(1);
  };

  const mapMarkers = mapRoutes.map(r => ({
    coords: [r.lat, r.lng] as [number, number],
    title: r.title,
    description: r.category,
    color: CATEGORY_COLORS[r.category] ?? 'blue',
  }));

  return (
    <>
      <Header />
      <div className="ds-page pt-20 pb-10">

      {/* ── Hero header ─────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="ds-h1 mb-1">Маршруты Камчатки</h1>
        <p className="text-[var(--text-secondary)] text-sm md:text-base">
          {meta.total.toLocaleString('ru-RU')} маршрутов и достопримечательностей
        </p>
      </div>

      {/* ── Search + view toggle ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Поиск маршрутов…"
            className="ds-input w-full pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => { setSort(e.target.value as typeof sort); setPage(1); }}
          className="ds-input w-auto pr-8 text-sm"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-2 transition-colors duration-150 ${view === 'grid' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            title="Сеткой"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('map')}
            className={`px-3 py-2 transition-colors duration-150 ${view === 'map' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            title="На карте"
          >
            <Map className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Category tabs ─────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
              category === cat.value
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] bg-[var(--bg-card)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Map view ──────────────────────────────────────────── */}
      {view === 'map' && (
        <div className="mb-6">
          {mapLoading ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg h-[520px] flex items-center justify-center">
              <div className="animate-spin w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <YandexMap
              markers={mapMarkers}
              center={[53.0, 158.7]}
              zoom={6}
              height="520px"
              className="w-full"
            />
          )}
          <p className="text-xs text-[var(--text-muted)] mt-2 text-right">
            {mapRoutes.length.toLocaleString('ru-RU')} точек с координатами
          </p>
        </div>
      )}

      {/* ── Grid view ─────────────────────────────────────────── */}
      {view === 'grid' && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div key={i} className="ds-skeleton rounded-lg h-44" />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="py-24 text-center">
              <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)]">Нет маршрутов по вашему запросу</p>
              <button
                onClick={() => { handleSearch(''); handleCategoryChange(''); }}
                className="mt-4 ds-btn ds-btn-secondary text-sm"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {routes.map(route => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          )}

          {/* ── Pagination ──────────────────────────────────── */}
          {!loading && meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="ds-btn ds-btn-secondary px-3 py-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--text-secondary)] px-2">
                {page} / {meta.pages}
              </span>
              <button
                disabled={page >= meta.pages}
                onClick={() => setPage(p => p + 1)}
                className="ds-btn ds-btn-secondary px-3 py-2 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  vulkani:              'red',
  termalnye_istochniki: 'blue',
  morskie_progulki:     'darkBlue',
  eco:                  'green',
  rybalka:              'darkCyan',
  snegohod:             'lightBlue',
  vertoletnye_tury:     'orange',
  trekking:             'darkGreen',
  geyzery:              'red',
  rivers:               'blue',
  lakes:                'teal',
  medvedi:              'brown',
  mountains:            'gray',
  dzhip:                'darkOrange',
};
