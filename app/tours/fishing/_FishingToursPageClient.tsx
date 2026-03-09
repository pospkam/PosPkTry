'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TourCard, TourCardData } from '@/components/tours/TourCard';
import { BreadcrumbJsonLd } from '@/components/seo';
import {
  Fish, Search, SlidersHorizontal, MapPin, Calendar, AlertTriangle, X,
  Sun, Moon, User,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import BottomNav from '@/components/shared/BottomNav';
import Link from 'next/link';

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
    season:       (t.season as string[]) || [],
    route:        t.route ?? null,
  };
}

const DIFFICULTIES = [
  { value: '',       label: 'Любая сложность' },
  { value: 'easy',   label: 'Лёгкий'          },
  { value: 'medium', label: 'Средний'          },
  { value: 'hard',   label: 'Сложный'          },
];

const LIMIT = 18;

export default function FishingToursPageClient() {
  const { isDark, toggleTheme } = useTheme();
  const [tours, setTours]       = useState<ApiTour[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);

  const [search, setSearch]         = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [maxPrice, setMaxPrice]     = useState('');

  const fetchTours = useCallback(async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ category: 'fishing' });
      if (search)     params.set('search', search);
      if (difficulty) params.set('difficulty', difficulty);
      if (maxPrice)   params.set('maxPrice', maxPrice);
      const off = reset ? 0 : offset;
      params.set('limit',  String(LIMIT));
      params.set('offset', String(off));

      const res  = await fetch(`/api/tours?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка API');

      const newTours: ApiTour[] = data.data.tours;
      setTours(prev => reset ? newTours : [...prev, ...newTours]);
      setTotal(data.data.pagination.total);
      if (!reset) setOffset(off + newTours.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, difficulty, maxPrice, offset]);

  useEffect(() => {
    setOffset(0);
    setTours([]);
    fetchTours(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, difficulty, maxPrice]);

  const hasFilters = !!(search || difficulty || maxPrice);
  const clearFilters = () => { setSearch(''); setDifficulty(''); setMaxPrice(''); };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kamchatour.ru';

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Standard header */}
      <header style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.15)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)", fontSize: '1.4rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
            KH
          </Link>
          <h1 className="text-lg font-bold text-white hidden sm:block">Рыбалка на Камчатке</h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-white/70 hover:text-white transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/profile" className="text-white/70 hover:text-white transition-colors" aria-label="Личный кабинет">
              <User size={20} />
            </Link>
          </div>
        </div>
      </header>

    <main className="text-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная',  url: baseUrl            },
          { name: 'Туры',     url: `${baseUrl}/tours`  },
          { name: 'Рыбалка',  url: `${baseUrl}/tours/fishing` },
        ]}
      />

      {/* Hero */}
      <div className="relative bg-gradient-to-b from-[#0a1628]/50 to-transparent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-premium-gold/20 rounded-2xl">
              <Fish className="w-10 h-10 text-premium-gold" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">Рыболовные туры</h1>
              <p className="text-white/70">Камчатка — лучшие реки для лосося и форели</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Фильтры */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-4 text-white/70">
            <SlidersHorizontal className="w-4 h-4 text-premium-gold" />
            <span className="text-sm font-medium">Фильтры</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-3 h-3" /> Сбросить
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

            {/* Сложность */}
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/50"
            >
              {DIFFICULTIES.map(d => (
                <option key={d.value} value={d.value} className="bg-black">{d.label}</option>
              ))}
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

        {/* Ошибка */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6 flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <p className="text-white font-semibold mb-1">Ошибка загрузки</p>
              <p className="text-white/70 text-sm">{error}</p>
            </div>
            <button
              onClick={() => fetchTours(true)}
              className="ml-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
            >
              Повторить
            </button>
          </div>
        )}

        {/* Список туров */}
        {loading && tours.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-12 text-center">
            <Fish className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-bold text-white mb-2">Туры не найдены</h3>
            <p className="text-white/50">Попробуйте изменить фильтры</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tours.map(tour => (
                <TourCard
                  key={tour.id}
                  tour={toCardData(tour)}
                  href={`/tours/fishing/${tour.id}`}
                />
              ))}
            </div>

            {tours.length < total && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => fetchTours(false)}
                  disabled={loading}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Загрузка...' : `Загрузить ещё (${total - tours.length})`}
                </button>
              </div>
            )}
          </>
        )}

        {/* Контактный баннер */}
        <div className="mt-12 bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Не нашли подходящий тур?</h2>
          <p className="text-white/70 mb-6">Подберём индивидуальную программу рыбалки на Камчатке</p>
          <div className="flex flex-wrap gap-3 justify-center text-sm text-white/50">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Камчатский край
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Сезон: май — октябрь
            </span>
          </div>
        </div>
      </div>
    </main>

      <BottomNav activePath="/tours" />
    </div>
  );
}
