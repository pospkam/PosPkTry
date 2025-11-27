'use client';

import React, { useState, useEffect } from 'react';
import { Tour } from '@/types';
import { WeatherWidget } from '@/components/WeatherWidget';
import AISmartSearch from '@/components/AISmartSearch';
import FloatingAIButton from '@/components/FloatingAIButton';
import RegistrationButtons from '@/components/RegistrationButtons';
import { 
  Mountain, Compass, Fish, CloudSnow, Waves, Droplet,
  Users, Briefcase, Award, Truck, Home as HomeIcon, ShoppingBag,
  Rocket, AlertTriangle, Leaf, Brain, Clock, UsersRound, Star, ArrowRight,
  Flame, TreePine
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
      icon: HomeIcon,
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
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-32 text-center">
          <div className="space-y-6">
            {/* Заголовок */}
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-extralight text-white drop-shadow-lg tracking-tight" style={{ textShadow: '0 4px 16px rgba(0, 0, 0, 0.2)', letterSpacing: '-0.02em' }}>
              Исследуйте Камчатку
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl text-white/80 max-w-3xl mx-auto leading-relaxed font-extralight" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}>
              Откройте для себя удивительный мир вулканов, гейзеров и дикой природы
            </p>

            
            {/* AI Smart Search */}
            <div className="pt-6 max-w-4xl mx-auto">
              <AISmartSearch />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - 3 карточки */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 - Вулканы */}
          <div className="bg-white/15 backdrop-blur-2xl rounded-[2rem] p-10 sm:p-14 text-center border border-white/15 hover:bg-white/20 hover:border-white/25 transition-all duration-500 group cursor-pointer" style={{ backdropFilter: 'blur(30px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}>
            <div className="mb-8 inline-block">
              <Flame className="w-16 h-16 sm:w-24 sm:h-24 text-orange-300/90 group-hover:scale-110 group-hover:text-orange-300 transition-all duration-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extralight text-white mb-4 sm:mb-5 tracking-wide" style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.15)' }}>Вулканы</h3>
            <p className="text-base sm:text-lg text-white/75 leading-relaxed font-extralight" style={{ textShadow: '0 1px 6px rgba(0, 0, 0, 0.1)' }}>
              Восхождения на действующие вулканы с опытными гидами
            </p>
          </div>

          {/* Feature 2 - Дикая природа */}
          <div className="bg-white/15 backdrop-blur-2xl rounded-[2rem] p-10 sm:p-14 text-center border border-white/15 hover:bg-white/20 hover:border-white/25 transition-all duration-500 group cursor-pointer" style={{ backdropFilter: 'blur(30px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}>
            <div className="mb-8 inline-block">
              <TreePine className="w-16 h-16 sm:w-24 sm:h-24 text-emerald-300/90 group-hover:scale-110 group-hover:text-emerald-300 transition-all duration-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extralight text-white mb-4 sm:mb-5 tracking-wide" style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.15)' }}>Дикая природа</h3>
            <p className="text-base sm:text-lg text-white/75 leading-relaxed font-extralight" style={{ textShadow: '0 1px 6px rgba(0, 0, 0, 0.1)' }}>
              Наблюдение за медведями, китами и редкими птицами
            </p>
          </div>

          {/* Feature 3 - Гейзеры */}
          <div className="bg-white/15 backdrop-blur-2xl rounded-[2rem] p-10 sm:p-14 text-center border border-white/15 hover:bg-white/20 hover:border-white/25 transition-all duration-500 sm:col-span-2 md:col-span-1 group cursor-pointer" style={{ backdropFilter: 'blur(30px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}>
            <div className="mb-8 inline-block">
              <Droplet className="w-16 h-16 sm:w-24 sm:h-24 text-sky-300/90 group-hover:scale-110 group-hover:text-sky-300 transition-all duration-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extralight text-white mb-4 sm:mb-5 tracking-wide" style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.15)' }}>Гейзеры</h3>
            <p className="text-base sm:text-lg text-white/75 leading-relaxed font-extralight" style={{ textShadow: '0 1px 6px rgba(0, 0, 0, 0.1)' }}>
              Долина Гейзеров - одно из чудес России
            </p>
          </div>
        </div>
      </section>

      {/* ДВЕ ИЗЫСКАННЫЕ КНОПКИ - ТУРИСТ И БИЗНЕС */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <RegistrationButtons />
      </section>


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
                <div className="bg-white/15 backdrop-blur-2xl rounded-3xl p-6 border border-white/15 hover:bg-white/30 hover:scale-105 transition-all duration-500 shadow-xl hover:shadow-2xl h-full" style={{ backdropFilter: 'blur(20px)' }}>
                  {/* Gradient Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl`}>
                    <role.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-extralight mb-2 text-white" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.15)' }}>{role.title}</h3>
                  <p className="text-white/80 mb-4 font-extralight text-sm" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>{role.subtitle}</p>
                  
                  <div className="flex items-center gap-2 text-white/90 font-extralight group-hover:gap-3 transition-all text-sm" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
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
                  className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-3xl h-80 animate-pulse border border-white/15"
                ></div>
              ))}
            </div>
          ) : tours.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour) => (
                <div
                  key={tour.id}
                  className="group relative bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-blue-900/30 backdrop-blur-2xl border border-white/15 rounded-3xl overflow-hidden hover:border-white/30 transition-all duration-300 cursor-pointer"
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
                    
                    <div className="flex items-end justify-between mt-4 pt-4 border-t border-white/15">
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
            <div className="text-center py-20 bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-3xl border border-white/15">
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
          <div className="bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-6">
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
          <div className="bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 backdrop-blur-2xl border border-green-500/20 rounded-3xl p-6">
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
          <div className="bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30 backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-6">
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
              { title: 'Размещение', href: '/hub/stay', icon: HomeIcon },
              { title: 'Прокат авто', href: '/cars', icon: Truck },
              { title: 'Снаряжение', href: '/gear', icon: ShoppingBag },
              { title: 'Сувениры', href: '/shop', icon: ShoppingBag },
              { title: 'Партнёры', href: '/partners', icon: UsersRound },
              { title: 'Личный кабинет', href: '/hub/tourist', icon: Users },
            ].map(({ title, href, icon: Icon }) => (
              <a
                key={title}
                href={href}
                className="flex items-center justify-center gap-2 text-center p-4 bg-white/20 hover:bg-white/15 backdrop-blur-sm border border-white/30 hover:border-white/15 rounded-2xl transition-all font-extralight text-white/90 hover:text-white shadow-lg"
                style={{ backdropFilter: 'blur(16px)', textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}
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
          <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-white/15 rounded-3xl p-8 text-center">
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
