'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Map, LayoutGrid, SlidersHorizontal, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import RouteCard, { type RouteItem } from '@/components/routes/RouteCard';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

// ЧТО ДЕЛАТЬ — фильтры каталога по activity_type
const ACTIVITIES = [
  { value: '',              label: 'Все активности' },
  { value: 'trekking',     label: 'Треккинг' },
  { value: 'fishing',      label: 'Рыбалка' },
  { value: 'bear_watching',label: 'Медведи' },
  { value: 'helicopter',   label: 'Вертолёт' },
  { value: 'thermal',      label: 'Термальные' },
  { value: 'boat_trip',    label: 'Море' },
  { value: 'snowmobile',   label: 'Снегоходы' },
  { value: 'jeep',         label: 'Джип' },
  { value: 'eco',          label: 'Экотуризм' },
  { value: 'diving',       label: 'Дайвинг' },
  { value: 'surf',         label: 'Сёрфинг' },
  { value: 'cultural',     label: 'Культура' },
  { value: 'photo',        label: 'Фототур' },
];

// ГДЕ — цвета маркеров по location_type
const LOCATION_COLORS: Record<string, string> = {
  volcano:    'orange',
  geyser:     'green',
  hot_spring: 'red',
  lake:       'lightBlue',
  mountain:   'darkBlue',
  river:      'teal',
  bay:        'darkCyan',
  waterfall:  'blue',
  cape:       'gray',
  island:     'purple',
  rock:       'brown',
  forest:     'darkGreen',
  beach:      'orange',
  viewpoint:  'cyan',
  museum:     'purple',
  historical: 'brown',
  other:      'gray',
};

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Рекомендуемые' },
  { value: 'title',       label: 'А — Я' },
  { value: 'price_asc',   label: 'Цена: дешёвые' },
  { value: 'price_desc',  label: 'Цена: дорогие' },
  { value: 'recent',      label: 'Новые' },
];

const DIFFICULTY_OPTIONS = [
  { value: '',       label: 'Любая' },
  { value: 'easy',   label: 'Лёгкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'hard',   label: 'Сложная' },
];

const PRICE_RANGES = [
  { value: '',             label: 'Любая цена',         min: undefined, max: undefined },
  { value: '0-5000',       label: 'до 5 000 ₽',         min: 0,         max: 5000 },
  { value: '5000-25000',   label: '5 000 — 25 000 ₽',   min: 5000,      max: 25000 },
  { value: '25000-100000', label: '25 000 — 100 000 ₽', min: 25000,     max: 100000 },
  { value: '100000',       label: 'от 100 000 ₽',       min: 100000,    max: undefined },
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
  locationType: string | null;
  lat: number;
  lng: number;
}

type SortValue = 'title' | 'recent' | 'price_asc' | 'price_desc' | 'recommended';
type DifficultyValue = '' | 'easy' | 'medium' | 'hard';

export default function RoutesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [activityType, setActivityType] = useState(searchParams.get('activity_type') ?? '');
  const [sort, setSort] = useState<SortValue>('recommended');
  const [difficulty, setDifficulty] = useState<DifficultyValue>('');
  const [priceRange, setPriceRange] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [mapRoutes, setMapRoutes] = useState<MapRoute[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const activeFiltersCount = [difficulty, priceRange].filter(Boolean).length;

  const getPriceParams = useCallback(() => {
    const range = PRICE_RANGES.find(r => r.value === priceRange);
    return { price_min: range?.min, price_max: range?.max };
  }, [priceRange]);

  // ── Fetch grid data ──────────────────────────────────────────
  const fetchRoutes = useCallback(async (
    q: string, act: string, pg: number, srt: string,
    diff: string, price_min?: number, price_max?: number,
  ) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT), sort: srt, kind: 'place' });
    if (q)             params.set('q', q);
    if (act)           params.set('activity_type', act);
    if (diff)          params.set('difficulty', diff);
    if (price_min != null) params.set('price_min', String(price_min));
    if (price_max != null) params.set('price_max', String(price_max));
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

  // ── Fetch map pins ───────────────────────────────────────────
  const fetchMapRoutes = useCallback(async () => {
    setMapLoading(true);
    const params = new URLSearchParams({ limit: '500', hasCoords: 'true', kind: 'place' });
    if (activityType) params.set('activity_type', activityType);
    if (query)        params.set('q', query);
    if (difficulty)   params.set('difficulty', difficulty);
    try {
      const res = await fetch(`/api/routes?${params}`);
      const json: RoutesResponse = await res.json();
      if (json.success) {
        setMapRoutes(
          (json.data as (RouteItem & { lat: number; lng: number; locationType: string | null })[])
            .filter(r => r.lat != null && r.lng != null)
            .map(r => ({ id: r.id, title: r.title, locationType: r.locationType ?? null, lat: r.lat, lng: r.lng }))
        );
      }
    } catch { /* silent */ }
    setMapLoading(false);
  }, [activityType, query, difficulty]);

  // ── Trigger fetch ────────────────────────────────────────────
  useEffect(() => {
    const { price_min, price_max } = getPriceParams();
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRoutes(query, activityType, page, sort, difficulty, price_min, price_max);
    }, query ? 300 : 0);
  }, [query, activityType, page, sort, difficulty, priceRange, fetchRoutes, getPriceParams]);

  useEffect(() => {
    if (view === 'map') fetchMapRoutes();
  }, [view, fetchMapRoutes]);

  // ── Sync URL ─────────────────────────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams();
    if (query)        p.set('q', query);
    if (activityType) p.set('activity_type', activityType);
    if (page > 1)     p.set('page', String(page));
    router.replace(`/routes${p.size ? '?' + p : ''}`, { scroll: false });
  }, [query, activityType, page, router]);

  const resetFilters = () => { setDifficulty(''); setPriceRange(''); setPage(1); };
  const handleActivityChange = (act: string) => { setActivityType(act); setPage(1); };
  const handleSearch = (val: string) => { setQuery(val); setPage(1); };

  const mapMarkers = mapRoutes.map(r => ({
    coords:      [r.lat, r.lng] as [number, number],
    title:       r.title,
    description: r.locationType ?? '',
    color:       LOCATION_COLORS[r.locationType ?? 'other'] ?? 'blue',
    href:        `/routes/${r.id}`,
    type:        MarkerType.TOUR,
    category:    r.locationType ?? 'other',
  }));

  return (
    <>
      <Header />
      <div className="ds-page pt-20 pb-10">

        {/* ── Hero header ───────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="ds-h1 mb-1">Места Камчатки</h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-base">
            {meta.total.toLocaleString('ru-RU')} природных мест и достопримечательностей
          </p>
        </div>

        {/* ── Search + controls ─────────────────────────────── */}
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
            onChange={e => { setSort(e.target.value as SortValue); setPage(1); }}
            className="ds-input w-auto pr-8 text-sm"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`relative ds-btn ds-btn-secondary flex items-center gap-2 text-sm ${showFilters ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Фильтры
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--accent)] text-[var(--text-primary)] text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* View toggle */}
          <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-2 transition-colors duration-150 ${view === 'grid' ? 'bg-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              title="Сеткой"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('map')}
              className={`px-3 py-2 transition-colors duration-150 ${view === 'map' ? 'bg-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              title="На карте"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Filter panel ──────────────────────────────────── */}
        {showFilters && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="ds-label mb-2">Цена</p>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => { setPriceRange(r.value); setPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-150 ${
                      priceRange === r.value
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 bg-[var(--bg-card)]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="ds-label mb-2">Сложность</p>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => { setDifficulty(d.value as DifficultyValue); setPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-150 ${
                      difficulty === d.value
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 bg-[var(--bg-card)]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="sm:col-span-2 flex justify-end">
                <button onClick={resetFilters} className="ds-btn ds-btn-secondary text-sm flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Сбросить фильтры
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Activity tabs (ЧТО ДЕЛАТЬ) ──────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {ACTIVITIES.map(act => (
            <button
              key={act.value}
              onClick={() => handleActivityChange(act.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                activityType === act.value
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] bg-[var(--bg-card)]'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>

        {/* ── Map view ───────────────────────────────────────── */}
        {view === 'map' && (
          <div className="mb-6">
            {mapLoading ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg h-[520px] flex items-center justify-center">
                <div className="animate-spin w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent" />
              </div>
            ) : (
              <LeafletMap
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

        {/* ── Grid view ──────────────────────────────────────── */}
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
                  onClick={() => { handleSearch(''); handleActivityChange(''); resetFilters(); }}
                  className="mt-4 ds-btn ds-btn-secondary text-sm"
                >
                  Сбросить всё
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {routes.map(route => (
                  <RouteCard key={route.id} route={route} />
                ))}
              </div>
            )}

            {/* ── Pagination ──────────────────────────────── */}
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
