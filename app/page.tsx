'use client';

import React, { useState, useEffect } from 'react';
import { Tour, Partner } from '@/types';
import { WeatherWidget } from '@/components/WeatherWidget';

export default function Home() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchData();
    getUserLocation();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загружаем туры - ИСПРАВЛЕНО: правильный путь к данным
      const toursResponse = await fetch('/api/tours?limit=6');
      const toursData = await toursResponse.json();
      if (toursData.success && toursData.data && toursData.data.tours) {
        setTours(toursData.data.tours);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    // Устанавливаем координаты Петропавловска-Камчатского по умолчанию
    setUserLocation({
      lat: 53.0195,
      lng: 158.6505,
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Hero Section - Samsung Weather Style */}
      <section className="relative overflow-hidden mx-4 mt-6 mb-8 rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-blue-900/40 backdrop-blur-xl border border-white/10"></div>
        <div className="relative p-8 md:p-12">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Заголовок */}
            <div className="space-y-3">
              <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent leading-tight">
                Камчатка
              </h1>
              <p className="text-2xl md:text-3xl font-bold text-white/90">
                Экосистема туризма
              </p>
            </div>
            
            {/* Описание */}
            <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              Туры, бронирование, безопасность и эко-баллы в едином современном центре
            </p>

            {/* Кнопки действий */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <a 
                href="/demo"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                🚀 Демо-режим
              </a>
              <a 
                href="/auth/login"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl border border-white/20 backdrop-blur-sm transition-all"
              >
                Войти
              </a>
            </div>

            {/* Подсказка */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
              <span className="text-lg">💡</span>
              <span>Демо-режим — попробуйте все функции без регистрации</span>
            </div>
          </div>
        </div>
      </section>

      {/* Weather Widget - Samsung Style */}
      {userLocation && (
        <section className="px-4 mb-8">
          <div className="max-w-4xl mx-auto">
            <WeatherWidget
              lat={userLocation.lat}
              lng={userLocation.lng}
              location="Петропавловск-Камчатский"
            />
          </div>
        </section>
      )}

      {/* Tours Section - Samsung Glass Style */}
      <section className="px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6 px-2">Популярные туры</h2>
          
          {loading ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-3xl h-80 animate-pulse border border-white/10"
                ></div>
              ))}
            </div>
          ) : tours.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour) => (
                <div
                  key={tour.id}
                  className="group relative bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-blue-900/30 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:border-white/30 transition-all duration-300 cursor-pointer"
                >
                  {/* Фоновое изображение */}
                  {tour.images && tour.images[0] && (
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                      <img 
                        src={tour.images[0]} 
                        alt={tour.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Контент */}
                  <div className="relative p-6 h-full flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
                        {tour.title}
                      </h3>
                      <p className="text-white/70 text-sm line-clamp-3 mb-4">
                        {tour.description}
                      </p>
                      
                      {/* Метаданные */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-white/60">
                          <span>⏱️</span>
                          <span>{tour.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/60">
                          <span>👥</span>
                          <span>{tour.minParticipants}-{tour.maxParticipants} чел</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Цена и рейтинг */}
                    <div className="flex items-end justify-between mt-4 pt-4 border-t border-white/10">
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {tour.priceFrom?.toLocaleString('ru-RU')} ₽
                        </div>
                        {tour.priceTo && tour.priceTo !== tour.priceFrom && (
                          <div className="text-sm text-white/50">
                            до {tour.priceTo?.toLocaleString('ru-RU')} ₽
                          </div>
                        )}
                      </div>
                      
                      {tour.rating > 0 && (
                        <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-1 rounded-full">
                          <span className="text-amber-400">⭐</span>
                          <span className="text-white font-semibold">{tour.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-3xl border border-white/10">
              <div className="text-6xl mb-4">🏔️</div>
              <p className="text-white/70 text-lg">Туры временно недоступны</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Grid - Samsung Glass Cards */}
      <section className="px-4 mb-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* SOS и Безопасность */}
          <div className="bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6">
            <div className="text-red-400 text-sm font-semibold mb-3">SOS и безопасность</div>
            <div className="space-y-3">
              <a 
                href="/hub/safety" 
                className="block text-center py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
              >
                🆘 SOS
              </a>
              <a 
                href="#" 
                className="block text-center py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all"
              >
                МЧС
              </a>
              <a 
                href="#" 
                className="block text-center py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all"
              >
                Сейсмика
              </a>
            </div>
            <div className="text-white/50 text-xs mt-4">Тестовый режим</div>
          </div>

          {/* Эко-баллы */}
          <div className="bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 backdrop-blur-xl border border-green-500/20 rounded-3xl p-6">
            <div className="text-green-400 text-sm font-semibold mb-3">Экология</div>
            <div className="text-4xl font-black text-green-400 mb-2">
              Eco-points
            </div>
            <div className="text-white/70 mb-6">
              Собирайте баллы за бережное поведение
            </div>
            <a 
              href="/hub/tourist" 
              className="block text-center py-3 bg-green-500/20 hover:bg-green-500/30 text-green-300 font-semibold rounded-xl border border-green-500/30 transition-all"
            >
              Узнать больше
            </a>
          </div>

          {/* AI-Гид */}
          <div className="bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-6">
            <div className="text-purple-400 text-sm font-semibold mb-3">AI-помощник</div>
            <div className="text-4xl font-black text-purple-400 mb-2">
              AI-Гид
            </div>
            <div className="text-white/70 mb-6">
              Умный помощник по Камчатке
            </div>
            <a 
              href="/demo" 
              className="block text-center py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold rounded-xl border border-purple-500/30 transition-all"
            >
              Попробовать
            </a>
          </div>
        </div>
      </section>

      {/* Quick Links - Samsung Style */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6 px-2">Быстрые переходы</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { title: '🏔️ Каталог туров', href: '/tours' },
              { title: '🔍 Поиск', href: '/search' },
              { title: '🏨 Размещение', href: '/hub/stay' },
              { title: '🚗 Прокат авто', href: '/cars' },
              { title: '🎒 Снаряжение', href: '/gear' },
              { title: '🎁 Сувениры', href: '/shop' },
              { title: '👥 Партнёры', href: '/partners' },
              { title: '📊 Личный кабинет', href: '/hub/tourist' },
            ].map(({ title, href }) => (
              <a
                key={title}
                href={href}
                className="text-center p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:from-blue-900/30 hover:to-purple-900/30 backdrop-blur-sm border border-white/10 hover:border-white/30 rounded-2xl transition-all font-semibold text-white/90 hover:text-white"
              >
                {title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <section className="px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-white/50 text-sm">
              🏔️ KamHub — Современная экосистема туризма Камчатки
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
