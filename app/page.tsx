'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TourCard } from '@/components/TourCard';

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
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-xl font-bold text-white">K</span>
            </div>
            <span className="text-xl font-bold text-white">Kamchatour Hub</span>
          </Link>
          <Link 
            href="/auth/login" 
            className="px-6 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
          >
            Войти
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
            Исследуйте
            <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Камчатку
            </span>
          </h1>
          <p className="text-xl text-neutral-400 mb-8 max-w-2xl mx-auto">
            Вулканы, гейзеры и дикая природа. Найдите свое приключение.
          </p>
          
          {/* Search */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск туров..."
                className="w-full px-6 py-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button className="absolute right-2 top-2 px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors">
                Найти
              </button>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/register?type=tourist"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold transition-all transform hover:scale-105"
            >
              Я турист
            </Link>
            <Link
              href="/auth/register?type=business"
              className="px-8 py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold border border-neutral-700 transition-all"
            >
              Я бизнес
            </Link>
          </div>
        </div>
      </section>

      {/* Tours */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">
              Популярные туры
            </h2>
            <Link href="/hub/tours" className="text-blue-400 hover:text-blue-300 transition-colors">
              Смотреть все →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-800 border-t-blue-500"></div>
            </div>
          ) : tours.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-neutral-900 rounded-2xl border border-neutral-800">
              <p className="text-neutral-400">Туры скоро появятся</p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Возможности платформы
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Онлайн бронирование',
                description: 'Бронируйте туры в один клик'
              },
              {
                title: 'Проверенные гиды',
                description: 'Работаем только с профессионалами'
              },
              {
                title: 'Безопасные платежи',
                description: 'Защита ваших средств'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-neutral-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Для кого платформа
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Турист', href: '/hub/tourist', desc: 'Найдите свое приключение' },
              { name: 'Туроператор', href: '/hub/operator', desc: 'Управляйте турами' },
              { name: 'Гид', href: '/hub/guide', desc: 'Проводите экскурсии' },
              { name: 'Трансфер', href: '/hub/transfer-operator', desc: 'Транспортные услуги' },
              { name: 'Агент', href: '/hub/agent', desc: 'Продавайте туры' },
              { name: 'Сувениры', href: '/hub/souvenirs', desc: 'Продавайте товары' },
            ].map((role, idx) => (
              <Link
                key={idx}
                href={role.href}
                className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-blue-500 hover:bg-neutral-800 transition-all group"
              >
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {role.name}
                </h3>
                <p className="text-neutral-400 text-sm">{role.desc}</p>
                <div className="mt-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Подробнее →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-neutral-500">
            © 2025 Kamchatour Hub. Экосистема туризма Камчатки.
          </p>
        </div>
      </footer>
    </div>
  );
}
