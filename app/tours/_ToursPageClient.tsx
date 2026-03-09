'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Sun, Moon, User, Mountain } from 'lucide-react';
import Logo from '@/components/shared/Logo';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import BottomNav from '@/components/shared/BottomNav';

const CATEGORIES = [
  { value: '',                     label: 'Все' },
  { value: 'vulkani',              label: 'Вулканы' },
  { value: 'rybalka',              label: 'Рыбалка' },
  { value: 'termalnye_istochniki', label: 'Термы' },
  { value: 'geyzery',              label: 'Гейзеры' },
  { value: 'trekking',             label: 'Треккинг' },
  { value: 'vertoletnye_tury',     label: 'Вертолёт' },
  { value: 'medvedi',              label: 'Медведи' },
  { value: 'morskie_progulki',     label: 'Море' },
  { value: 'snegohod',             label: 'Снегоход' },
  { value: 'dzhip',                label: 'Джип' },
  { value: 'lakes',                label: 'Озёра' },
  { value: 'mountains',            label: 'Горы' },
  { value: 'rivers',               label: 'Реки' },
  { value: 'eco',                  label: 'Эко' },
];

const CATEGORY_LABELS: Record<string, string> = {
  vulkani: 'Вулканы', rybalka: 'Рыбалка', termalnye_istochniki: 'Термы',
  geyzery: 'Гейзеры', trekking: 'Треккинг', vertoletnye_tury: 'Вертолёт',
  medvedi: 'Медведи', morskie_progulki: 'Море', snegohod: 'Снегоход',
  dzhip: 'Джип', lakes: 'Озёра', mountains: 'Горы', rivers: 'Реки', eco: 'Эко',
  volcanoes: 'Вулканы', fishing: 'Рыбалка', thermal: 'Термы',
  geysers: 'Гейзеры', snowmobile: 'Снегоход', jeep: 'Джип',
  wildlife: 'Медведи', adventure: 'Треккинг', helicopter: 'Вертолёт',
};

interface ApiTour {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  difficulty: string;
  duration: number;
  price: number;
  currency: string;
  maxGroupSize: number;
  minGroupSize: number;
  rating: number;
  reviewCount: number;
  images?: string[];
  included: string[];
  season: unknown[];
  sourceUrl?: string | null;
  sourceName?: string | null;
  source: 'tour' | 'route';
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

/* ─── Компактная карточка маршрута ─── */
function RouteCard({ tour }: { tour: ApiTour }) {
  const cat = CATEGORY_LABELS[tour.category] ?? tour.category;
  const desc = (tour.description || tour.shortDescription || '').slice(0, 120);

  return (
    <Link
      href={`/tours/${tour.id}`}
      className="group block bg-white/8 border border-white/12 rounded-2xl overflow-hidden hover:border-white/30 hover:bg-white/12 transition-all duration-200"
    >
      {/* Изображение / placeholder */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#0f1923] to-[#0B1120]">
        {tour.images && tour.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tour.images[0]}
            alt={tour.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mountain className="w-10 h-10 text-white/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badge категории */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-black/50 backdrop-blur-sm text-white/90">
          {cat}
        </span>
      </div>

      {/* Контент */}
      <div className="p-4">
        <h3 className="text-[15px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[#00D4FF] transition-colors">
          {tour.name}
        </h3>

        {desc && (
          <p className="mt-1.5 text-[13px] text-white/50 line-clamp-2 leading-relaxed">
            {desc}
          </p>
        )}

        {/* Нижняя строка: цена */}
        <div className="mt-3 flex items-center justify-between">
          {tour.price > 0 ? (
            <span className="text-[15px] font-bold text-premium-gold">
              от {formatPrice(tour.price)}
            </span>
          ) : (
            <span className="text-[13px] font-medium text-white/40">По запросу</span>
          )}
          <span className="text-[12px] text-white/30 group-hover:text-white/50 transition-colors">
            Подробнее →
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Страница ─── */
export default function ToursPageClient() {
  const searchParams = useSearchParams();
  const { isDark, toggleTheme } = useTheme();

  const [tours, setTours] = useState<ApiTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 18;

  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '');

  const fetchTours = useCallback(async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search)   params.set('search', search);
      if (category) params.set('category', category);
      const currentOffset = reset ? 0 : offset;
      params.set('limit', String(LIMIT));
      params.set('offset', String(currentOffset));

      const res = await fetch(`/api/tours?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка API');

      const newTours: ApiTour[] = data.data.tours;
      setTours(prev => reset ? newTours : [...prev, ...newTours]);
      setTotal(data.data.pagination.total);
      setOffset(reset ? newTours.length : currentOffset + newTours.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, category, offset]);

  useEffect(() => {
    setOffset(0);
    setTours([]);
    fetchTours(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const hasFilters = search || category;

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* ── Хедер ── */}
      <header style={{
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo size={28} />
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-white/60 hover:text-white transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/profile" className="text-white/60 hover:text-white transition-colors" aria-label="Профиль">
              <User size={18} />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-5 pb-8">
        {/* ── Заголовок ── */}
        <h1 className="text-2xl font-bold text-white mb-5">Маршруты Камчатки</h1>

        {/* ── Поиск ── */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Вулканы, рыбалка, медведи..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/8 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/25 transition-colors"
          />
        </div>

        {/* ── Категории ── */}
        <div className="mb-5 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 pb-0.5" style={{ minWidth: 'max-content' }}>
            {CATEGORIES.map(c => {
              const isActive = category === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCategory(isActive ? '' : c.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white/20 text-white border border-white/25'
                      : 'text-white/45 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Инфо-строка ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] text-white/35">
            {loading && tours.length === 0 ? '\u00A0' : `${total} маршрутов`}
          </p>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setCategory(''); }}
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* ── Контент ── */}
        {error ? (
          /* Ошибка — inline, не отдельная страница */
          <div className="py-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
              <span className="text-sm text-red-400/80">{error}</span>
            </div>
            <div>
              <button
                onClick={() => { setError(''); fetchTours(true); }}
                className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 text-sm font-medium rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Повторить
              </button>
            </div>
          </div>
        ) : loading && tours.length === 0 ? (
          /* Skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="aspect-[16/9] bg-white/5 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : tours.length === 0 ? (
          /* Пусто */
          <div className="py-20 text-center">
            <Mountain className="w-10 h-10 mx-auto mb-3 text-white/15" />
            <p className="text-white/40 text-sm mb-3">Ничего не найдено</p>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setCategory(''); }}
                className="text-[13px] text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          /* Карточки */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tours.map(tour => (
                <RouteCard key={tour.id} tour={tour} />
              ))}
            </div>

            {tours.length < total && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => fetchTours(false)}
                  disabled={loading}
                  className="px-6 py-2.5 bg-white/8 hover:bg-white/15 border border-white/10 text-white/60 text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
                >
                  {loading ? 'Загрузка...' : `Ещё ${total - tours.length}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav activePath="/tours" />
    </div>
  );
}
