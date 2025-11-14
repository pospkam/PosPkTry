'use client';

import React, { useState, useEffect } from 'react';
import { Tour, Partner, Weather } from '@/types';
import { TourCard } from '@/components/TourCard';
import { PartnerCard } from '@/components/PartnerCard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { EcoPointsWidget } from '@/components/EcoPointsWidget';
import { AIChatWidget } from '@/components/AIChatWidget';
import { Rocket, Lightbulb, Backpack, Building2, Map, Bus, Hotel, Gift, Tent, Car } from 'lucide-react';

export default function Home() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyEcoPoints, setNearbyEcoPoints] = useState([]);

  useEffect(() => {
    fetchData();
    getUserLocation();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загружаем туры
      const toursResponse = await fetch('/api/tours?limit=6');
      const toursData = await toursResponse.json();
      if (toursData.success && toursData.data?.data) {
        setTours(toursData.data.data);
      }

      // Загружаем партнеров
      const partnersResponse = await fetch('/api/partners?limit=6');
      const partnersData = await partnersResponse.json();
      if (partnersData.success && partnersData.data?.data) {
        setPartners(partnersData.data.data);
      }

      // Загружаем eco-points
      const ecoPointsResponse = await fetch('/api/eco-points?limit=10');
      const ecoPointsData = await ecoPointsResponse.json();
      if (ecoPointsData.success && ecoPointsData.data) {
        setNearbyEcoPoints(ecoPointsData.data);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation({
            lat: 53.0195,
            lng: 158.6505,
          });
        }
      );
    } else {
      setUserLocation({
        lat: 53.0195,
        lng: 158.6505,
      });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-sky-blue/5 to-ultramarine/5 dark:from-premium-black dark:via-premium-black dark:to-premium-black text-gray-900 dark:text-white transition-colors duration-300">
      {/* Hero Section - Modern */}
      <section className="relative overflow-hidden mx-6 mb-16 mt-8 rounded-[3rem] shadow-2xl animate-fade-in">
        <div className="absolute inset-0 -z-10">
          <video
            className="w-full h-[60vh] object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1520496938500-76fd098ad75a?q=80&w=1920&auto=format&fit=crop"
          >
            <source src="https://cdn.coverr.co/videos/coverr-aurora-over-mountains-0157/1080p.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-ultramarine/40 via-light-blue/30 to-deep-blue/40 dark:from-premium-black/50 dark:via-premium-gold/20 dark:to-premium-black/60"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ultramarine/90 via-ultramarine/40 to-transparent dark:from-black/90 dark:via-black/50 dark:to-transparent"></div>
        
        <div className="relative z-10 p-12 md:p-16 grid content-end gap-6 min-h-[60vh]">
          <div className="animate-fade-in-up">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-tight text-white drop-shadow-2xl mb-4">
              Камчатка
            </h1>
            <p className="text-2xl md:text-3xl font-bold text-white/95 drop-shadow-lg mb-2">
              экосистема путешествий
            </p>
            <p className="max-w-3xl text-lg md:text-xl text-white/90 drop-shadow-md">
              Туры, партнёры, CRM, бронирование, безопасность, рефералы и экология — в едином центре
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center animate-scale-in">
            <input 
              placeholder="Поиск: вулканы, океан, медведи..." 
              className="flex-1 h-16 rounded-2xl px-6 text-lg text-gray-900 bg-white/95 backdrop-blur border-2 border-white/50 focus:border-white focus:outline-none focus:ring-4 focus:ring-white/30 shadow-xl transition-all"
              name="q"
            />
            <a href="/demo" className="btn-primary whitespace-nowrap flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Попробовать демо
            </a>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4 animate-fade-in">
            <a href="/auth/login" className="px-8 py-3 bg-white/95 backdrop-blur text-ultramarine dark:text-premium-gold border-2 border-white rounded-2xl hover:bg-white hover:scale-105 transition-all font-bold shadow-lg text-lg">
              Войти
            </a>
            <a href="/auth/register" className="px-8 py-3 bg-white/20 backdrop-blur text-white border-2 border-white/50 rounded-2xl hover:bg-white/30 hover:border-white hover:scale-105 transition-all font-bold shadow-lg text-lg">
              Регистрация
            </a>
            <div className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur rounded-2xl border border-white/30 text-white/90 text-sm">
              <Lightbulb className="w-5 h-5" />
              <span><strong>Демо-режим:</strong> без регистрации</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 py-12 grid gap-12">
        <div className="text-center animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-black text-deep-blue dark:text-premium-gold mb-4">
            Выберите свою роль
          </h2>
          <p className="text-lg text-gray-600 dark:text-white/70 max-w-2xl mx-auto">
            Персонализированный опыт для каждого участника экосистемы туризма Камчатки
          </p>
        </div>
        
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {[
            { title: 'Турист', href: '/hub/tourist', icon: Backpack, desc: 'Откройте для себя Камчатку' },
            { title: 'Туроператор', href: '/hub/operator', icon: Building2, desc: 'Управляйте турами и клиентами' },
            { title: 'Гид', href: '/hub/guide', icon: Map, desc: 'Проводите незабываемые экскурсии' },
            { title: 'Трансфер', href: '/hub/transfer', icon: Bus, desc: 'Организуйте перевозки' },
            { title: 'Размещение', href: '/hub/stay', icon: Hotel, desc: 'Предложите уютное жильё' },
            { title: 'Сувениры', href: '/hub/souvenirs', icon: Gift, desc: 'Продавайте местные сувениры' },
            { title: 'Снаряжение', href: '/hub/gear', icon: Tent, desc: 'Прокат туристического оборудования' },
            { title: 'Авто', href: '/hub/cars', icon: Car, desc: 'Аренда автомобилей' },
          ].map(({ title, href, icon: Icon, desc }, index) => (
            <a 
              key={title} 
              href={href} 
              className="card-modern p-6 group animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300 text-ultramarine dark:text-premium-gold">
                <Icon className="w-12 h-12" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-ultramarine dark:text-premium-gold mb-2 group-hover:text-light-blue dark:group-hover:text-yellow-400 transition-colors">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-white/70">
                {desc}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Tours Section */}
      <section className="px-6 py-12 bg-gradient-modern rounded-[3rem] mx-6 mb-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-black text-deep-blue dark:text-premium-gold mb-4">
            Популярные туры
          </h2>
          <p className="text-lg text-gray-600 dark:text-white/70 max-w-2xl mx-auto">
            Исследуйте самые захватывающие маршруты Камчатки
          </p>
        </div>
        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-80 animate-pulse"></div>
            ))}
          </div>
        ) : tours.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onClick={() => {
                  console.log('Tour clicked:', tour.id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-white/70">
            Туры скоро появятся
          </div>
        )}
      </section>

      {/* Partners & Safety */}
      <section className="px-6 py-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 grid gap-4 sm:grid-cols-2 sm:items-start">
          <div className="grid gap-4">
            <div className="text-sm text-white/70">SOS и безопасность</div>
            <div className="grid gap-3">
              <a href="#" className="rounded-xl bg-premium-gold text-premium-black text-center py-3 font-bold">SOS</a>
              <a href="#" className="rounded-xl bg-white/10 text-center py-3 font-bold">МЧС</a>
              <a href="#" className="rounded-xl bg-white/10 text-center py-3 font-bold">Сейсмика</a>
            </div>
            <div className="text-white/70 text-xs">Тестовый режим: интеграции в процессе</div>
          </div>
          <div className="w-full h-72 rounded-2xl overflow-hidden border border-white/10 bg-black grid place-items-center cursor-pointer group">
            <div className="w-[70%] sm:w-[80%]">
              <a href="/hub/safety" target="_blank" rel="noopener noreferrer" className="group inline-block w-full max-w-[520px]">
                <div className="rounded-2xl border border-white/10 bg-black grid place-items-center map-button-glow w-full">
                  <img src="/graphics/kamchatka-button.svg" alt="Камчатка" className="kamchatka-button w-full h-auto" />
                </div>
              </a>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 grid gap-2">
          <div className="text-sm text-white/70">Экология</div>
          <div className="text-2xl font-black text-premium-gold">Eco‑points: 0</div>
          <div className="text-white/70 text-sm">Собирайте баллы за бережное поведение</div>
        </div>
      </section>

      {/* AI Chat */}
      <section className="px-6 py-6">
        <h2 className="text-xl font-extrabold mb-4">AI-Гид по Камчатке</h2>
        <AIChatWidget userId="demo-user" />
      </section>

      {/* Quick Links */}
      <section className="px-6 py-8 grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Быстрые переходы</h2>
        </div>
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
          <a href="/partners" className="text-center font-semibold border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10">Каталог туров</a>
          <a href="/search" className="text-center font-semibold border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10">Поиск</a>
          <a href="/premium" className="text-center font-semibold border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10">Витрина Commerce</a>
          <a href="/premium2" className="text-center font-semibold border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10">Витрина Adventure</a>
          <a href="/hub/stay" className="text-center font-semibold border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10">Размещение</a>
          <a href="/hub/safety" className="text-center font-semibold border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10">Безопасность</a>
          <a href="/hub/operator" className="text-center font-semibold border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10">Рефералы и бусты</a>
        </div>
      </section>
    </main>
  );
}
