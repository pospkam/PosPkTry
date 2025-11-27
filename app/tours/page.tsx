'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tour } from '@/types';

export default function ToursPage() {
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

  const getActivityIcon = (activity: string) => {
    const icons: { [key: string]: string } = {
      hiking: '🥾',
      sightseeing: '👁️',
      wildlife: '🐻',
      fishing: '🎣',
      skiing: '🎿',
      diving: '🤿',
    };
    return icons[activity] || '🏔️';
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
    if (filters.activity && tour.activity !== filters.activity) return false;
    if (filters.difficulty && tour.difficulty !== filters.difficulty) return false;
    if (tour.priceFrom > filters.priceRange[1]) return false;
    if (filters.search && !tour.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/40 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>Загружаем туры...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="bg-white/25 backdrop-blur-xl rounded-2xl p-8 text-center max-w-md border border-white/40" style={{ backdropFilter: 'blur(20px)' }}>
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-light text-white mb-4" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)' }}>
            Ошибка загрузки
          </h1>
          <p className="text-white/80 mb-6" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-colors font-light"
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
      <div className="bg-white/25 backdrop-blur-xl border-b border-white/40" style={{ backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-light text-white mb-2" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)' }}>
            Туры по Камчатке
          </h1>
          <p className="text-white/80 text-lg" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>
            Откройте для себя удивительные маршруты
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white/25 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-white/40" style={{ backdropFilter: 'blur(20px)' }}>
          <h3 className="text-xl font-light text-white mb-4" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>Фильтры</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-light text-white/80 mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>Поиск</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/50"
                style={{ backdropFilter: 'blur(10px)' }}
                placeholder="Название тура..."
              />
            </div>

            <div>
              <label className="block text-sm font-light text-white/80 mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>Активность</label>
              <select
                value={filters.activity}
                onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
                className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-light text-white/80 mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>Сложность</label>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                <option value="">Любая сложность</option>
                <option value="easy">Легкая</option>
                <option value="medium">Средняя</option>
                <option value="hard">Сложная</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-light text-white/80 mb-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>Цена до</label>
              <input
                type="number"
                value={filters.priceRange[1]}
                onChange={(e) => setFilters({ ...filters, priceRange: [filters.priceRange[0], parseInt(e.target.value)] })}
                className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/50"
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
          <div className="bg-white/25 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/40" style={{ backdropFilter: 'blur(20px)' }}>
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-light text-white mb-2" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)' }}>
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
                className="bg-white/25 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/40 hover:border-white/50 transition-all cursor-pointer group"
                style={{ backdropFilter: 'blur(20px)' }}
              >
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-cyan-500/20 relative">
                  {tour.images && tour.images.length > 0 ? (
                    <img
                      src={tour.images[0]}
                      alt={tour.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl">{getActivityIcon(tour.activity)}</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/30 backdrop-blur-xl text-white px-3 py-1 rounded-full text-sm font-light" style={{ backdropFilter: 'blur(10px)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
                    от {tour.priceFrom.toLocaleString()}₽
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-light text-white" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>{tour.title}</h3>
                    {tour.rating && (
                      <div className="flex items-center space-x-1">
                        <span className="text-white">⭐</span>
                        <span className="text-white font-light">{tour.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-white/80 text-sm mb-4 line-clamp-2" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }}>
                    {tour.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <span>{getActivityIcon(tour.activity)}</span>
                      </span>
                      <span className={`flex items-center space-x-1 ${getDifficultyColor(tour.difficulty)}`}>
                        <span>⚡</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>⏱️</span>
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
