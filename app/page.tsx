'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TourCard } from '@/components/TourCard';
import SamsungWeatherDynamic from '@/components/SamsungWeatherDynamic';
import AIKamSmartSearch from '@/components/AIKamSmartSearch';
import RegistrationButtons from '@/components/RegistrationButtons';
import WeatherBackground from '@/components/WeatherBackground';

interface Tour {
  id: number;
  name: string;
  description?: string;
  price?: number;
  duration_days?: number;
  image_url?: string;
  rating?: number;
}

export default function Home() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tours?limit=6');
      const data = await response.json();
      if (data.success && data.data) {
        const toursArray = Array.isArray(data.data) ? data.data : (data.data.data || []);
        setTours(toursArray);
      } else {
        setTours([]);
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
      setTours([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Динамический погодный фон */}
      <WeatherBackground />

      {/* Минимальная навигация - адаптивная */}
      <div className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50">
        <Link 
          href="/auth/login" 
          className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-2 border border-white/20 text-white hover:bg-white/20 transition-all"
        >
          <svg width="20" height="20" className="sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="text-xs sm:text-sm font-medium">Вход</span>
        </Link>
      </div>

      <main className="relative min-h-screen pt-4 pb-20">
        {/* Hero Section - улучшенный */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-32 text-center">
          {/* Анимированный заголовок с градиентом */}
          <h1 className="weather-title scale-in mb-6 sm:mb-8">
            Исследуйте Камчатку
          </h1>
          
          {/* Подзаголовок с волновой анимацией */}
          <p className="weather-subtitle slide-up mb-12 sm:mb-16 max-w-3xl mx-auto px-4">
            Откройте для себя удивительный мир вулканов, гейзеров и дикой природы
          </p>
          
          {/* AI KAM - УМНЫЙ ПОИСК - увеличенный */}
          <div className="fade-in-delay-1 max-w-4xl mx-auto">
            <AIKamSmartSearch />
          </div>
        </section>

        {/* Features Grid - улучшенный с иконками */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 fade-in-delay-2">
            {/* Feature 1 - Вулканы */}
            <div className="weather-card p-8 sm:p-10 text-center group cursor-pointer">
              <div className="mb-6 inline-block">
                <svg className="w-16 h-16 sm:w-20 sm:h-20 text-orange-300 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Вулканы</h3>
              <p className="text-base sm:text-lg text-white/90 leading-relaxed">
                Восхождения на действующие вулканы с опытными гидами
              </p>
            </div>

            {/* Feature 2 - Дикая природа */}
            <div className="weather-card p-8 sm:p-10 text-center group cursor-pointer">
              <div className="mb-6 inline-block">
                <svg className="w-16 h-16 sm:w-20 sm:h-20 text-green-300 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Дикая природа</h3>
              <p className="text-base sm:text-lg text-white/90 leading-relaxed">
                Наблюдение за медведями, китами и редкими птицами
              </p>
            </div>

            {/* Feature 3 - Гейзеры */}
            <div className="weather-card p-8 sm:p-10 text-center group cursor-pointer sm:col-span-2 md:col-span-1">
              <div className="mb-6 inline-block">
                <svg className="w-16 h-16 sm:w-20 sm:h-20 text-cyan-300 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Гейзеры</h3>
              <p className="text-base sm:text-lg text-white/90 leading-relaxed">
                Долина Гейзеров - одно из чудес России
              </p>
            </div>
          </div>
        </section>

        {/* ДВЕ ИЗЫСКАННЫЕ КНОПКИ - ТУРИСТ И БИЗНЕС - адаптивные */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 fade-in-delay-3">
          <RegistrationButtons />
        </section>

        {/* Popular Tours - улучшенный заголовок */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-12 gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-2">
                Популярные туры
              </h2>
              <p className="text-white/70 text-sm sm:text-base">Откройте для себя лучшие маршруты</p>
            </div>
            <div className="flex gap-3">
              <Link href="/map" className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 sm:px-6 sm:py-3 rounded-full text-white hover:bg-white/20 transition-all border border-white/20 hover:scale-105 text-sm sm:text-base">
                <span className="font-semibold">🗺️ Карта</span>
              </Link>
              <Link href="/hub/tours" className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 sm:px-6 sm:py-3 rounded-full text-white hover:bg-white/20 transition-all border border-white/20 hover:scale-105 text-sm sm:text-base">
                <span className="font-semibold">Все туры</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-white/20 border-t-white"></div>
            </div>
          ) : tours.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {tours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          ) : (
            <div className="weather-card p-8 sm:p-12 text-center">
              <p className="text-lg sm:text-xl text-white/80">Туры скоро появятся</p>
            </div>
          )}
        </section>

        {/* CTA Section - улучшенный с градиентом */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 text-center">
          <div className="relative weather-card p-8 sm:p-12 md:p-16 overflow-hidden group">
            {/* Анимированный фон */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
            
            <div className="relative z-10">
              <div className="inline-block mb-6">
                <svg className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-300 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
                Готовы к приключению?
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
                Присоединяйтесь к тысячам путешественников, открывающих для себя Камчатку
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
                <Link href="/hub/tourist" className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-blue-500/50 hover:scale-105">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Начать путешествие
                </Link>
                <Link href="/partner/register" className="inline-flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all duration-300 border-2 border-white/30 hover:border-white/50 hover:scale-105">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Стать партнером
                </Link>
              </div>
            </div>
            
            {/* Декоративные элементы */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl" />
          </div>
        </section>

        {/* Roles Section - БЕЗ ЭМОДЗИ */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold text-white text-center mb-12 text-shadow-soft">
            Выберите свою роль
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Турист', desc: 'Ищете приключения?', href: '/hub/tourist' },
              { name: 'Туроператор', desc: 'Организуете туры?', href: '/hub/operator' },
              { name: 'Гид', desc: 'Проводите экскурсии?', href: '/hub/guide' },
              { name: 'Трансфер', desc: 'Предоставляете транспорт?', href: '/hub/transfer-operator' },
              { name: 'Агент', desc: 'Продаете туры?', href: '/hub/agent' },
              { name: 'Сувениры', desc: 'Продаете сувениры?', href: '/hub/souvenirs' },
            ].map((role, idx) => (
              <Link 
                key={idx}
                href={role.href}
                className="weather-card p-8 text-center group"
              >
                <h3 className="text-2xl font-bold text-white mb-2">{role.name}</h3>
                <p className="text-white/70">{role.desc}</p>
                <div className="mt-4 text-white/60 group-hover:text-white transition-colors">
                  Подробнее →
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative py-8 px-4 backdrop-blur-xl bg-white/5 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/70">© 2025 KamHub. Экосистема туризма Камчатки</p>
        </div>
      </footer>
    </>
  );
}
