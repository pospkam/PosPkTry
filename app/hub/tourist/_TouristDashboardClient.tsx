'use client';

import React, { useState, useEffect } from 'react';
import { Weather } from '@/types';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { TransferSearchWidget } from '@/components/transfer-operator/TransferSearchWidget';
import { TouristNav } from '@/components/tourist/TouristNav';
import { Mountain, Eye, CloudSnow, Wind, Sun, Cloud, CloudRain, Bot, Heart, Target, Droplets, Bus } from 'lucide-react';
import RecommendationCard, { RecommendationCardSkeleton } from '@/components/tourist/RecommendationCard';
import type { RecommendedTour } from '@/lib/recommendations/engine';
import Link from 'next/link';
import { TourCard, TourCardData } from '@/components/tours/TourCard';

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

export default function TouristDashboardClient() {
  const [tours, setTours] = useState<ApiTour[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('tours');
  const [filters, setFilters] = useState({
    activity: '',
    priceRange: [0, 50000],
    difficulty: '',
  });
  const [transferResults, setTransferResults] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedTour[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);

  useEffect(() => {
    fetchTours();
    fetchWeather();
    fetchRecommendations();
  }, []);

  const fetchTours = async () => {
    try {
      const response = await fetch('/api/tours');
      const data = await response.json();
      if (data.success) {
        setTours(data.data.tours);
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    try {
      // Координаты Петропавловска-Камчатского
      const response = await fetch('/api/weather?lat=53.0375&lng=158.6556&location=Петропавловск-Камчатский');
      const data = await response.json();
      if (data.success) {
        setWeather(data.data);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setRecsLoading(true);
      const res = await fetch('/api/tourist/recommendations?limit=6');
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data);
      }
    } catch {
      // Не критично
    } finally {
      setRecsLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      clear: <Sun className="w-6 h-6" />,
      mostly_clear: <Cloud className="w-6 h-6" />,
      partly_cloudy: <Cloud className="w-6 h-6" />,
      overcast: <Cloud className="w-6 h-6" />,
      rain: <CloudRain className="w-6 h-6" />,
      snow: <CloudSnow className="w-6 h-6" />,
      thunderstorm: <CloudRain className="w-6 h-6" />,
      fog: <Cloud className="w-6 h-6" />,
    };
    return iconMap[condition] || <Cloud className="w-6 h-6" />;
  };

  const getSafetyLevelColor = (level: string) => {
    const colors: { [key: string]: string } = {
      excellent: 'text-green-400',
      good: 'text-blue-400',
      difficult: 'text-yellow-400',
      dangerous: 'text-red-400',
    };
    return colors[level] || 'text-gray-400';
  };

  const tabs = [
    { id: 'tours', name: 'Туры', Icon: Mountain },
    { id: 'transfers', name: 'Трансферы', Icon: Bus },
    { id: 'weather', name: 'Погода', Icon: Sun },
    { id: 'ai', name: 'AI-помощник', Icon: Bot },
    { id: 'favorites', name: 'Избранное', Icon: Heart },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/15 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загружаем туры...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TouristNav />
      {/* Header */}
      <div className="bg-white/15 backdrop-blur-2xl border-b border-white/15" style={{ backdropFilter: 'blur(10px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-extralight text-white" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.15)' }}>Добро пожаловать, Турист!</h1>
              <p className="text-white/80 mt-1" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.1)' }}>Откройте для себя удивительную Камчатку</p>
            </div>
            <div className="flex items-center space-x-4">
              {weather && (
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getWeatherIcon(weather.condition)}</span>
                    <span className="text-white text-lg font-bold">{weather.temperature}°C</span>
                  </div>
                  <p className="text-white/70 text-sm">{weather.location}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex overflow-x-auto space-x-1 bg-white/15 rounded-xl p-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 shrink-0 flex items-center justify-center space-x-2 py-3 px-3 sm:px-4 rounded-lg transition-colors ${
                selectedTab === tab.id
                  ? 'bg-gradient-to-r from-sky-200 to-cyan-200 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {React.createElement(tab.Icon, { className: 'w-5 h-5' })}
              <span className="font-medium hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tours Tab */}
        {selectedTab === 'tours' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white/15 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Фильтры</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="filter-activity" className="block text-sm font-medium text-white/70 mb-2">Активность</label>
                  <select
                    id="filter-activity"
                    value={filters.activity}
                    onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
                    className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                  <label htmlFor="filter-difficulty" className="block text-sm font-medium text-white/70 mb-2">Сложность</label>
                  <select
                    id="filter-difficulty"
                    value={filters.difficulty}
                    onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                    className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="">Любая сложность</option>
                    <option value="easy">Легкая</option>
                    <option value="medium">Средняя</option>
                    <option value="hard">Сложная</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-price" className="block text-sm font-medium text-white/70 mb-2">Цена до</label>
                  <input
                    id="filter-price"
                    type="number"
                    value={filters.priceRange[1]}
                    onChange={(e) => setFilters({ ...filters, priceRange: [filters.priceRange[0], parseInt(e.target.value)] })}
                    className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                    placeholder="50000"
                  />
                </div>
              </div>
            </div>

            {/* Tours Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tours.map((tour) => (
                <TourCard key={tour.id} tour={toCardData(tour)} />
              ))}
            </div>
          </div>
        )}

        {/* Transfers Tab */}
        {selectedTab === 'transfers' && (
          <div className="space-y-6">
            <TransferSearchWidget 
              onSearchResults={setTransferResults}
              className="w-full"
            />
          </div>
        )}

        {/* Weather Tab */}
        {selectedTab === 'weather' && weather && (
          <div className="space-y-6">
            <div className="bg-white/15 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-white mb-6">Текущая погода</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-4xl mb-2">{getWeatherIcon(weather.condition)}</div>
                  <div className="text-3xl font-bold text-white">{weather.temperature}°C</div>
                  <div className="text-white/70 capitalize">{weather.condition}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2"><Wind className="w-4 h-4" /></div>
                  <div className="text-xl font-bold text-white">{weather.windSpeed} км/ч</div>
                  <div className="text-white/70">Ветер</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2"><Droplets className="w-6 h-6" /></div>
                  <div className="text-xl font-bold text-white">{weather.humidity}%</div>
                  <div className="text-white/70">Влажность</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2"><Eye className="w-6 h-6" /></div>
                  <div className="text-xl font-bold text-white">{weather.visibility} км</div>
                  <div className="text-white/70">Видимость</div>
                </div>
              </div>
              
              <div className="border-t border-white/15 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white">Уровень безопасности</h4>
                  <span className={`text-lg font-bold ${getSafetyLevelColor(weather.safetyLevel)}`}>
                    {weather.safetyLevel === 'excellent' && 'Отличный'}
                    {weather.safetyLevel === 'good' && 'Хороший'}
                    {weather.safetyLevel === 'difficult' && 'Сложный'}
                    {weather.safetyLevel === 'dangerous' && 'Опасный'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {weather.recommendations?.map((rec) => (
                    <div key={rec} className="text-white/70 text-sm">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Forecast */}
            {weather.forecast && weather.forecast.length > 0 && (
              <div className="bg-white/15 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Прогноз на неделю</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                  {weather.forecast.map((day) => (
                    <div key={day.date.toISOString()} className="text-center">
                      <div className="text-sm text-white/70 mb-2">
                        {day.date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                      </div>
                      <div className="text-2xl mb-2">{getWeatherIcon(day.condition)}</div>
                      <div className="text-white font-bold">{day.temperature.max}°</div>
                      <div className="text-white/70 text-sm">{day.temperature.min}°</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transfers Tab */}
        {selectedTab === 'transfers' && (
          <div className="space-y-6">
            <TransferSearchWidget 
              onSearchResults={setTransferResults}
              className="w-full"
            />
          </div>
        )}

        {/* AI Tab */}
        {selectedTab === 'ai' && (
          <div className="max-w-4xl mx-auto">
            <AIChatWidget userId="tourist-1" />
          </div>
        )}

        {/* Favorites Tab */}
        {selectedTab === 'favorites' && (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto mb-4 text-white/50" />
            <h3 className="text-2xl font-bold text-white mb-2">Избранные туры</h3>
            <p className="text-white/70">Здесь будут ваши избранные туры</p>
          </div>
        )}

        {/* ── Рекомендации ── */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5" />
              Рекомендуем вам
            </h2>
            <Link
              href="/tours"
              className="text-sm text-premium-gold/80 hover:text-premium-gold transition-colors"
            >
              Смотреть все →
            </Link>
          </div>
          {recsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <RecommendationCardSkeleton key={i} />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.slice(0, 3).map((tour) => (
                <RecommendationCard
                  key={tour.id}
                  tour={tour}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}