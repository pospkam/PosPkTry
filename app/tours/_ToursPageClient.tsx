'use client';

import React, { useState, useEffect } from 'react';import { Search } from 'lucide-react';import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Tour } from '@/types';
import { Star, Zap, Clock, AlertTriangle } from 'lucide-react';
import { ActivityIcon } from '@/components/icons';

export default function ToursPageClient() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    activity: '',
    priceRange: [0, 100000],
    difficulty: '',
    search: '',
  });

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      const response = await fetch('/api/tours');
      const data = await response.json();
      if (data.success) {
        setTours(data.data.tours);
      } else {
        setError('Не удалось загрузить туры');
      }
    } catch (err) {
      setError('Ошибка при загрузке туров');
      console.error('Error fetching tours:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: { [key: string]: string } = {
      easy: 'text-green-400',
      medium: 'text-yellow-400',
      hard: 'text-red-400',
    };
    return colors[difficulty] || 'text-gray-400';
  };

  const filteredTours = tours.filter((tour) => {
    if (filters.activity && (tour.activity || tour.category) !== filters.activity) return false;
    if (filters.difficulty && tour.difficulty !== filters.difficulty) return false;
    if ((tour.priceFrom ?? tour.price ?? 0) > filters.priceRange[1]) return false;
    const tourName = tour.title || tour.name || '';
    if (filters.search && !tourName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/15 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>Загружаем туры...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="bg-white/15 backdrop-blur-2xl rounded-2xl p-8 text-center max-w-md border border-white/15" style={{ backdropFilter: 'blur(10px)' }}>
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-extralight text-white mb-4" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)' }}>
            Ошибка загрузки
          </h1>
          <p className="text-white/80 mb-6" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-sky-200 to-cyan-200 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-colors font-extralight"
            style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-2xl border-b border-white/15" style={{ backdropFilter: 'blur(10px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-extralight text-white mb-2" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)' }}>
            Туры по Камчатке
          </h1>
          <p className="text-white/80 text-lg" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>
            Откройте для себя удивительные маршруты
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white/15 backdrop-blur-2xl rounded-2xl p-6 mb-8 border border-white/15" style={{ backdropFilter: 'blur(10px)' }}>
          <h3 className="text-xl font-extralight text-white mb-4" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>Фильтры</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="tour-search" className="block text-sm font-extralight text-white/80 mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>Поиск</label>
              <input
                id="tour-search"
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder-white/50"
                style={{ backdropFilter: 'blur(10px)' }}
                placeholder="Название тура..."
              />
            </div>

            <div>
              <label htmlFor="tour-activity" className="block text-sm font-extralight text-white/80 mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>Активность</label>
              <select
                id="tour-activity"
                value={filters.activity}
                onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
                className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                <option value="">Все активности</option>
                <option value="hiking">Пешие походы</option>
                <option value="sightseeing">Экскурсии</option>
                <option value="wildlife">Дикая природа</option>
                <option value="fishing">Рыбалка</option>
                <option value="skiing">Лыжи</option>
                <option value="diving">Дайвинг</option>
              </select>
            </div>

            <div>
              <label htmlFor="tour-difficulty" className="block text-sm font-extralight text-white/80 mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>Сложность</label>
              <select
                id="tour-difficulty"
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                <option value="">Любая сложность</option>
                <option value="easy">Легкая</option>
                <option value="medium">Средняя</option>
                <option value="hard">Сложная</option>
              </select>
            </div>

            <div>
              <label htmlFor="tour-price" className="block text-sm font-extralight text-white/80 mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>Цена до</label>
              <input
                id="tour-price"
                type="number"
                value={filters.priceRange[1]}
                onChange={(e) => setFilters({ ...filters, priceRange: [filters.priceRange[0], parseInt(e.target.value)] })}
                className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder-white/50"
                style={{ backdropFilter: 'blur(10px)' }}
                placeholder="100000"
              />
            </div>
          </div>

          <div className="mt-4 text-sm text-white/70" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>
            Найдено туров: <span className="font-semibold text-white">{filteredTours.length}</span> из {tours.length}
          </div>
        </div>

        {/* Tours Grid */}
        {filteredTours.length === 0 ? (
          <div className="bg-white/15 backdrop-blur-2xl rounded-2xl p-12 text-center border border-white/15" style={{ backdropFilter: 'blur(10px)' }}>
            <Search className="w-16 h-16 mx-auto mb-4 text-sky-400 opacity-80" />
            <h3 className="text-2xl font-extralight text-white mb-2" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)' }}>
              Туры не найдены
            </h3>
            <p className="text-white/80" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>
              Попробуйте изменить параметры фильтра
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTours.map((tour) => (
              <div
                key={tour.id}
                onClick={() => router.push(`/tours/${tour.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/tours/${tour.id}`)}
                role="button"
                tabIndex={0}
                className="bg-white/15 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/15 hover:border-white/50 transition-all cursor-pointer group"
                style={{ backdropFilter: 'blur(10px)' }}
                aria-label={`Перейти к туру ${tour.title || tour.name}`}
              >
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-cyan-500/20 relative">
                  {tour.images && tour.images.length > 0 ? (
                    <Image
                      src={tour.images[0]}
                      alt={tour.title || tour.name || 'Тур'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ActivityIcon activity={tour.activity} className="w-16 h-16 text-white/60" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/30 backdrop-blur-2xl text-white px-3 py-1 rounded-full text-sm font-extralight" style={{ backdropFilter: 'blur(10px)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
                    от {(tour.priceFrom ?? tour.price ?? 0).toLocaleString()}₽
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-extralight text-white" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>{tour.title || tour.name}</h3>
                    {tour.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-white fill-yellow-400" strokeWidth={1.5} />
                        <span className="text-white font-extralight">{tour.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-white/80 text-sm mb-4 line-clamp-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>
                    {tour.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1 text-white/70">
                        <ActivityIcon activity={tour.activity} className="w-4 h-4" />
                      </span>
                      <span className={`flex items-center space-x-1 ${getDifficultyColor(tour.difficulty)}`}>
                        <Zap className="w-4 h-4" strokeWidth={1.5} />
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" strokeWidth={1.5} />
                        <span>{tour.duration}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
