'use client';

import React, { useState, useEffect } from 'react';
import { Tour } from '@/types';
import { WeatherWidget } from '@/components/WeatherWidget';
import AISmartSearch from '@/components/AISmartSearch';
import FloatingAIButton from '@/components/FloatingAIButton';
import { 
  Mountain, Compass, Fish, CloudSnow, Waves, Droplet,
  Users, Briefcase, Award, Truck, Home, ShoppingBag,
  Rocket, AlertTriangle, Leaf, Brain, Clock, UsersRound, Star, ArrowRight
} from 'lucide-react';

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
    setUserLocation({
      lat: 53.0195,
      lng: 158.6505,
    });
  };

  const roles = [
    {
      id: 'tourist',
      title: 'Турист',
      subtitle: 'Открой Камчатку',
      href: '/hub/tourist',
      icon: Users,
      color: 'from-blue-400 to-cyan-400'
    },
    {
      id: 'operator',
      title: 'Туроператор',
      subtitle: 'Управляй турами',
      href: '/hub/operator',
      icon: Briefcase,
      color: 'from-purple-400 to-pink-400'
    },
    {
      id: 'guide',
      title: 'Гид',
      subtitle: 'Проводи туры',
      href: '/hub/guide',
      icon: Award,
      color: 'from-green-400 to-emerald-400'
    },
    {
      id: 'transfer',
      title: 'Трансфер',
      subtitle: 'Перевози туристов',
      href: '/hub/transfer-operator',
      icon: Truck,
      color: 'from-orange-400 to-red-400'
    },
    {
      id: 'accommodation',
      title: 'Размещение',
      subtitle: 'Предоставляй жильё',
      href: '/hub/stay',
      icon: Home,
      color: 'from-indigo-400 to-blue-400'
    },
    {
      id: 'souvenirs',
      title: 'Сувениры',
      subtitle: 'Продавай сувениры',
      href: '/shop',
      icon: ShoppingBag,
      color: 'from-pink-400 to-rose-400'
    }
  ];

  return (
    <main className="min-h-screen relative">
      {/* Hero Section - Samsung Weather Style */}
      <section className="relative overflow-hidden mx-4 mt-6 mb-8 rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-blue-900/40 backdrop-blur-xl border border-white/10"></div>
        <div className="relative p-6 md:p-10">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            {/* Заголовок */}
            <div className="space-y-2">
              <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent leading-tight">
                Камчатка
              </h1>
              <p className="text-xl md:text-2xl font-bold text-white/90">
                Экосистема туризма
              </p>
            </div>
            
            {/* AI Smart Search */}
            <div className="pt-4">
              <AISmartSearch />
            </div>

            {/* Кнопки действий */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <a 
                href="/demo"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                <Rocket className="w-4 h-4" />
                Демо-режим
              </a>
              <a 
                href="/auth/login"
                className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl border border-white/20 backdrop-blur-sm transition-all"
              >
                Войти
              </a>
            </div>

            {/* Подсказка */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
              <Brain className="w-4 h-4" />
              <span>Демо-режим — попробуйте все функции без регистрации</span>
            </div>
          </div>
        </div>
      </section>

      {/* Weather Widget */}
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

      {/* Roles Section - HORIZONTAL SCROLL */}
      <section className="px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 px-2" style={{ color: 'var(--ultramarine-light)' }}>
            Для кого платформа
          </h2>
          
          {/* Horizontal Scroll Container */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            {roles.map((role) => (
              <a
                key={role.id}
                href={role.href}
                className="group flex-shrink-0 w-72 snap-center"
              >
                <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-6 border border-white/50 hover:bg-white/90 hover:scale-105 transition-all duration-500 shadow-xl hover:shadow-2xl h-full">
                  {/* Gradient Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl`}>
                    <role.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-light mb-2 text-gray-800">{role.title}</h3>
                  <p className="text-gray-500 mb-4 font-light text-sm">{role.subtitle}</p>
                  
                  <div className="flex items-center gap-2 text-blue-600 font-light group-hover:gap-3 transition-all text-sm">
                    Узнать больше
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Tours Section */}
      <section className="px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 px-2" style={{ color: 'var(--ultramarine-light)' }}>
            Популярные туры
          </h2>
          
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
                  {tour.images && tour.images[0] && (
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                      <img 
                        src={tour.images[0]} 
                        alt={tour.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="relative p-6 h-full flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
                        {tour.title}
                      </h3>
                      <p className="text-white/70 text-sm line-clamp-3 mb-4">
                        {tour.description}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-white/60">
                          <Clock className="w-4 h-4" />
                          <span>{tour.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/60">
                          <UsersRound className="w-4 h-4" />
                          <span>{tour.minParticipants}-{tour.maxParticipants} чел</span>
                        </div>
                      </div>
                    </div>
                    
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
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
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
              <Mountain className="w-16 h-16 mx-auto mb-4 text-white/50" />
              <p className="text-white/70 text-lg">Туры временно недоступны</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 mb-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* SOS и Безопасность */}
          <div className="bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6">
            <div className="text-red-400 text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SOS и безопасность
            </div>
            <div className="space-y-3">
              <a 
                href="/hub/safety" 
                className="flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
              >
                <AlertTriangle className="w-5 h-5" />
                SOS
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
            <div className="text-green-400 text-sm font-semibold mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4" />
              Экология
            </div>
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
            <div className="text-purple-400 text-sm font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI-помощник
            </div>
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

      {/* Quick Links */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 px-2" style={{ color: 'var(--ultramarine-light)' }}>
            Быстрые переходы
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { title: 'Каталог туров', href: '/tours', icon: Mountain },
              { title: 'Поиск', href: '/search', icon: Compass },
              { title: 'Размещение', href: '/hub/stay', icon: Home },
              { title: 'Прокат авто', href: '/cars', icon: Truck },
              { title: 'Снаряжение', href: '/gear', icon: ShoppingBag },
              { title: 'Сувениры', href: '/shop', icon: ShoppingBag },
              { title: 'Партнёры', href: '/partners', icon: UsersRound },
              { title: 'Личный кабинет', href: '/hub/tourist', icon: Users },
            ].map(({ title, href, icon: Icon }) => (
              <a
                key={title}
                href={href}
                className="flex items-center justify-center gap-2 text-center p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:from-blue-900/30 hover:to-purple-900/30 backdrop-blur-sm border border-white/10 hover:border-white/30 rounded-2xl transition-all font-semibold text-white/90 hover:text-white"
              >
                <Icon className="w-4 h-4" />
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
            <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
              <Mountain className="w-5 h-5" />
              <span>KamHub — Современная экосистема туризма Камчатки</span>
            </div>
          </div>
        </div>
      </section>

      {/* Floating AI Button */}
      <FloatingAIButton />
    </main>
  );
}
