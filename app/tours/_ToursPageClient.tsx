'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { TourCard, TourCardData } from '@/components/tours/TourCard';

const CATEGORIES = [
  { value: '', label: 'Все категории' },
  { value: 'fishing',    label: 'Рыбалка' },
  { value: 'volcanoes',  label: 'Вулканы' },
  { value: 'thermal',    label: 'Термы' },
  { value: 'trekking',   label: 'Треккинг' },
  { value: 'helicopter', label: 'Вертолёт' },
  { value: 'bears',      label: 'Медведи' },
  { value: 'lakes',      label: 'Озёра' },
  { value: 'mountains',  label: 'Горы' },
  { value: 'rivers',     label: 'Реки' },
  { value: 'eco',        label: 'Эко-тур' },
  { value: 'combo',      label: 'Комбо' },
];

interface ApiTour {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  price: number;
  currency: string;
  maxGroupSize: number;
  minGroupSize: number;
  rating: number;
  reviewCount: number;
  images: string[];
  included: string[];
  season: unknown[];
  route?: { id: string; title: string; category: string } | null;
}

function toCardData(t: ApiTour): TourCardData {
  return {
    id:           t.id,
    name:         t.name,
    description:  t.description,
    category:     t.category,
    difficulty:   (t.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
    duration:     t.duration,
    price:        t.price,
    currency:     t.currency || 'RUB',
    maxGroupSize: t.maxGroupSize || 20,
    minGroupSize: t.minGroupSize || 1,
    rating:       t.rating || 0,
    reviewCount:  t.reviewCount || 0,
    images:       t.images || [],
    included:     t.included || [],
    season:       t.season || [],
    route:        t.route ?? null,
  };
}

export default function ToursPageClient() {
  const [tours, setTours] = useState<ApiTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 18;

  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchTours = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)     params.set('search', search);
      if (category)   params.set('category', category);
      if (difficulty) params.set('difficulty', difficulty);
      if (maxPrice)   params.set('maxPrice', maxPrice);
      const currentOffset = reset ? 0 : offset;
      params.set('limit', String(LIMIT));
      params.set('offset', String(currentOffset));

      const res = await fetch(`/api/tours?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка API');

      const newTours: ApiTour[] = data.data.tours;
      setTours(prev => reset ? newTours : [...prev, ...newTours]);
      setTotal(data.data.pagination.total);
      if (!reset) setOffset(currentOffset + newTours.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, category, difficulty, maxPrice, offset]);

  // Сброс при смене фильтров
  useEffect(() => {
    setOffset(0);
    setTours([]);
    fetchTours(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, difficulty, maxPrice]);

  const loadMore = () => fetchTours(false);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">Ошибка загрузки</h2>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={() => { setError(''); fetchTours(true); }}
            className="px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Шапка */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-white mb-1">Туры по Камчатке</h1>
          <p className="text-white/60 text-lg">Вулканы, реки, термы и дикая природа</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Фильтры */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-4 text-white/70">
            <SlidersHorizontal className="w-4 h-4 text-premium-gold" />
            <span className="text-sm font-medium">Фильтры</span>
            {(search || category || difficulty || maxPrice) && (
              <button
                onClick={() => { setSearch(''); setCategory(''); setDifficulty(''); setMaxPrice(''); }}
                className="ml-auto text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Поиск */}
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск тура..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/50"
              />
            </div>

            {/* Категория */}
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/50"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>
              ))}
            </select>

            {/* Сложность */}
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/50"
            >
              <option value="" className="bg-gray-900">Любая сложность</option>
              <option value="easy"   className="bg-gray-900">Лёгкий</option>
              <option value="medium" className="bg-gray-900">Средний</option>
              <option value="hard"   className="bg-gray-900">Сложный</option>
            </select>

            {/* Цена до */}
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Цена до ₽"
              className="px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/50"
            />
          </div>

          <p className="mt-3 text-xs text-white/40">
            {loading && tours.length === 0 ? 'Загрузка...' : `Найдено: ${total} туров`}
          </p>
        </div>

        {/* Список туров */}
        {loading && tours.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-bold text-white mb-2">Туры не найдены</h3>
            <p className="text-white/50">Попробуйте изменить фильтры</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tours.map(tour => (
                <TourCard key={tour.id} tour={toCardData(tour)} />
              ))}
            </div>

            {/* Загрузить ещё */}
            {tours.length < total && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Загрузка...' : `Загрузить ещё (${total - tours.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
