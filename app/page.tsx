'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TourCard } from '@/components/TourCard';
import SamsungWeatherDynamic from '@/components/SamsungWeatherDynamic';
import AIKamSmartSearch from '@/components/AIKamSmartSearch';
import RegistrationButtons from '@/components/RegistrationButtons';

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
      {/* SAMSUNG WEATHER - Динамический фон с анимациями */}
      <SamsungWeatherDynamic />

      {/* Header */}
      <header className="weather-header fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-2xl font-bold text-white">K</span>
            </div>
            <span className="text-xl font-bold text-white">KamHub</span>
          </Link>
          <Link 
            href="/auth/login" 
            className="weather-btn"
          >
            Войти
          </Link>
        </div>
      </header>

      <main className="relative min-h-screen pt-24 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 py-20 text-center fade-in">
          <h1 className="weather-title">
            Исследуйте Камчатку
          </h1>
          <p className="weather-subtitle mb-12 max-w-3xl mx-auto">
            Откройте для себя удивительный мир вулканов, гейзеров и дикой природы
          </p>
          
          {/* AI KAM - УМНЫЙ ПОИСК */}
          <AIKamSmartSearch />
        </section>

        {/* Features Grid - БЕЗ ЭМОДЗИ */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-6 fade-in-delay-2">
            {/* Feature 1 */}
            <div className="weather-card p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-3">Вулканы</h3>
              <p className="text-white/80">
                Восхождения на действующие вулканы с опытными гидами
              </p>
            </div>

            {/* Feature 2 */}
            <div className="weather-card p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-3">Дикая природа</h3>
              <p className="text-white/80">
                Наблюдение за медведями, китами и редкими птицами
              </p>
            </div>

            {/* Feature 3 */}
            <div className="weather-card p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-3">Гейзеры</h3>
              <p className="text-white/80">
                Долина Гейзеров - одно из чудес России
              </p>
            </div>
          </div>
        </section>

        {/* ДВЕ ИЗЫСКАННЫЕ КНОПКИ - ТУРИСТ И БИЗНЕС */}
        <section className="max-w-7xl mx-auto px-4 py-16 fade-in-delay-3">
          <RegistrationButtons />
        </section>

        {/* Popular Tours */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl font-bold text-white text-shadow-soft">
              Популярные туры
            </h2>
            <Link href="/hub/tours" className="text-white/90 hover:text-white transition-colors">
              Смотреть все →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
            </div>
          ) : tours.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          ) : (
            <div className="weather-card p-12 text-center">
              <p className="text-xl text-white/80">Туры скоро появятся</p>
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="weather-card p-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Готовы к приключению?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам путешественников, открывающих для себя Камчатку
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/hub/tourist" className="weather-btn weather-btn-primary text-lg px-8 py-4">
                Начать путешествие
              </Link>
              <Link href="/partner/register" className="weather-btn text-lg px-8 py-4">
                Стать партнером
              </Link>
            </div>
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
