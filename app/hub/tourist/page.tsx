'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tour, Weather } from '@/types';
import { AIChatWidget } from '@/components/AIChatWidget';
import { TransferSearchWidget } from '@/components/TransferSearchWidget';

export default function TouristDashboard() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('tours');
  const [filters, setFilters] = useState({
    activity: '',
    priceRange: [0, 50000],
    difficulty: '',
  });
  const [transferResults, setTransferResults] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    fetchTours();
    fetchWeather();
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('tourist_favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = (tourId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(tourId)
        ? prev.filter(id => id !== tourId)
        : [...prev, tourId];
      localStorage.setItem('tourist_favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const handleBookTour = (tourId: string) => {
    router.push(`/hub/tourist/bookings/new?tourId=${tourId}`);
  };

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

  const getActivityIcon = (activity: string) => {
    const icons: { [key: string]: string } = {
      hiking: '🥾',
      sightseeing: '○',
      wildlife: '🐻',
      fishing: '🎣',
      skiing: '🎿',
      diving: '🤿',
    };
    return icons[activity] || ' ';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: { [key: string]: string } = {
      easy: 'text-green-400',
      medium: 'text-yellow-400',
      hard: 'text-red-400',
    };
    return colors[difficulty] || 'text-gray-400';
  };

  const getWeatherIcon = (condition: string) => {
    const icons: { [key: string]: string } = {
      clear: ' ',
      mostly_clear: '🌤️',
      partly_cloudy: '⛅',
      overcast: '☁️',
      rain: ' ',
      snow: ' ',
      thunderstorm: '⛈️',
      fog: '🌫️',
    };
    return icons[condition] || '🌤️';
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

  // Apply filters to tours
  const filteredTours = useMemo(() => {
    return tours.filter(tour => {
      // Activity filter
      if (filters.activity && tour.activity !== filters.activity) {
        return false;
      }
      
      // Difficulty filter
      if (filters.difficulty && tour.difficulty !== filters.difficulty) {
        return false;
      }
      
      // Price filter
      if (tour.priceFrom > filters.priceRange[1]) {
        return false;
      }
      
      return true;
    });
  }, [tours, filters]);

  const favoriteTours = useMemo(() => {
    return tours.filter(tour => favorites.includes(tour.id));
  }, [tours, favorites]);

  const tabs = [
    { id: 'tours', name: 'Туры', icon: ' ' },
    { id: 'transfers', name: 'Трансферы', icon: ' ' },
    { id: 'weather', name: 'Погода', icon: '🌤️' },
    { id: 'ai', name: 'AI-помощник', icon: '🤖' },
    { id: 'favorites', name: 'Избранное', icon: '❤️' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-premium-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-premium-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загружаем туры...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-premium-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-premium-black to-premium-gold/10 border-b border-premium-gold/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Добро пожаловать, Турист!</h1>
              <p className="text-white/70 mt-1">Откройте для себя удивительную Камчатку</p>
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
        <div className="flex space-x-1 bg-white/5 rounded-xl p-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors ${
                selectedTab === tab.id
                  ? 'bg-premium-gold text-premium-black'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tours Tab */}
        {selectedTab === 'tours' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white/5 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Фильтры</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Активность</label>
                  <select
                    value={filters.activity}
                    onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
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
                  <label className="block text-sm font-medium text-white/70 mb-2">Сложность</label>
                  <select
                    value={filters.difficulty}
                    onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                  >
                    <option value="">Любая сложность</option>
                    <option value="easy">Легкая</option>
                    <option value="medium">Средняя</option>
                    <option value="hard">Сложная</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Цена до</label>
                  <input
                    type="number"
                    value={filters.priceRange[1]}
                    onChange={(e) => setFilters({ ...filters, priceRange: [filters.priceRange[0], parseInt(e.target.value)] })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                    placeholder="50000"
                  />
                </div>
              </div>
            </div>

            {/* Tours Grid */}
            {filteredTours.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4"> </div>
                <h3 className="text-2xl font-bold text-white mb-2">Туры не найдены</h3>
                <p className="text-white/70">Попробуйте изменить фильтры</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTours.map((tour) => (
                <div key={tour.id} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-premium-gold/50 transition-colors">
                  <div className="aspect-video bg-gradient-to-br from-premium-gold/20 to-premium-black relative">
                    {tour.images && tour.images.length > 0 ? (
                      <img
                        src={tour.images[0]}
                        alt={tour.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl">{getActivityIcon(tour.activity)}</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-premium-gold text-premium-black px-3 py-1 rounded-full text-sm font-bold">
                      {tour.priceFrom.toLocaleString()}₽
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-white">{tour.title}</h3>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleFavorite(tour.id)}
                          className="text-2xl hover:scale-110 transition-transform"
                        >
                          {favorites.includes(tour.id) ? '❤️' : '🤍'}
                        </button>
                        <div className="flex items-center space-x-1">
                          <span className="text-premium-gold">★</span>
                          <span className="text-white font-bold">{tour.rating}</span>
                          <span className="text-white/50">({tour.reviewsCount})</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">{tour.description}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-white/70">
                        <span className="flex items-center space-x-1">
                          <span>{getActivityIcon(tour.activity)}</span>
                          <span className="capitalize">{tour.activity}</span>
                        </span>
                        <span className={`flex items-center space-x-1 ${getDifficultyColor(tour.difficulty)}`}>
                          <span>⚡</span>
                          <span className="capitalize">{tour.difficulty}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span> </span>
                          <span>{tour.duration}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white/70">
                        <span>  {tour.minParticipants}-{tour.maxParticipants} чел.</span>
                      </div>
                      <button 
                        onClick={() => handleBookTour(tour.id)}
                        className="px-6 py-2 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold"
                      >
                        Забронировать
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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

        {/* Weather Tab */}
        {selectedTab === 'weather' && weather && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-white mb-6">Текущая погода</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-4xl mb-2">{getWeatherIcon(weather.condition)}</div>
                  <div className="text-3xl font-bold text-white">{weather.temperature}°C</div>
                  <div className="text-white/70 capitalize">{weather.condition}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">💨</div>
                  <div className="text-xl font-bold text-white">{weather.windSpeed} км/ч</div>
                  <div className="text-white/70">Ветер</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">💧</div>
                  <div className="text-xl font-bold text-white">{weather.humidity}%</div>
                  <div className="text-white/70">Влажность</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">○</div>
                  <div className="text-xl font-bold text-white">{weather.visibility} км</div>
                  <div className="text-white/70">Видимость</div>
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-6">
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
                  {weather.recommendations?.map((rec, index) => (
                    <div key={index} className="text-white/70 text-sm">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Forecast */}
            {weather.forecast && weather.forecast.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Прогноз на неделю</h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weather.forecast.map((day, index) => (
                    <div key={index} className="text-center">
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
          <div className="space-y-6">
            {favoriteTours.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">❤️</div>
                <h3 className="text-2xl font-bold text-white mb-2">Избранные туры</h3>
                <p className="text-white/70 mb-4">У вас пока нет избранных туров</p>
                <button
                  onClick={() => setSelectedTab('tours')}
                  className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold"
                >
                  Посмотреть все туры
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteTours.map((tour) => (
                  <div key={tour.id} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-premium-gold/50 transition-colors">
                    <div className="aspect-video bg-gradient-to-br from-premium-gold/20 to-premium-black relative">
                      {tour.images && tour.images.length > 0 ? (
                        <img
                          src={tour.images[0]}
                          alt={tour.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-6xl">{getActivityIcon(tour.activity)}</span>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-premium-gold text-premium-black px-3 py-1 rounded-full text-sm font-bold">
                        {tour.priceFrom.toLocaleString()}₽
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-white">{tour.title}</h3>
                        <button
                          onClick={() => toggleFavorite(tour.id)}
                          className="text-2xl hover:scale-110 transition-transform"
                        >
                          ❤️
                        </button>
                      </div>
                      
                      <p className="text-white/70 text-sm mb-4 line-clamp-2">{tour.description}</p>
                      
                      <button 
                        onClick={() => handleBookTour(tour.id)}
                        className="w-full px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold"
                      >
                        Забронировать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}