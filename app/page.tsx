'use client';

import React, { useState, useEffect } from 'react';
import { Tour, Partner, Weather } from '@/types';
import { TourCard } from '@/components/TourCard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { AIChatWidget } from '@/components/AIChatWidget';

export default function Home() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    getUserLocation();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const toursResponse = await fetch('/api/tours?limit=6');
      const toursData = await toursResponse.json();
      if (toursData.success) {
        setTours(toursData.data.data);
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
        () => {
          setUserLocation({ lat: 53.0195, lng: 158.6505 });
        }
      );
    } else {
      setUserLocation({ lat: 53.0195, lng: 158.6505 });
    }
  };

  const roles = [
    {
      id: 'tourist',
      name: 'Турист',
      icon: 'User',
      color: 'blue',
      shortDesc: 'Ищете приключения на Камчатке?',
      features: ['Поиск туров', 'AI-помощник', 'Бронирование онлайн', 'Отзывы и рейтинги', 'Система лояльности'],
      href: '/hub/tourist'
    },
    {
      id: 'operator',
      name: 'Туроператор',
      icon: 'Target',
      color: 'gold',
      shortDesc: 'Организуете туры по Камчатке?',
      features: ['Управление турами', 'CRM система', 'Аналитика продаж', 'Финансы и отчеты', 'Календарь бронирований'],
      href: '/hub/operator'
    },
    {
      id: 'guide',
      name: 'Гид',
      icon: 'GraduationCap',
      color: 'green',
      shortDesc: 'Проводите туры по Камчатке?',
      features: ['Расписание туров', 'Управление группами', 'Учет заработка', 'Рейтинг и отзывы', 'История экскурсий'],
      href: '/hub/guide'
    },
    {
      id: 'transfer',
      name: 'Трансфер',
      icon: 'Car',
      color: 'purple',
      shortDesc: 'Предоставляете трансферы?',
      features: ['Автопарк', 'Водители', 'Маршруты', 'Бронирования', 'Финансовая статистика'],
      href: '/hub/transfer-operator'
    },
    {
      id: 'agent',
      name: 'Агент',
      icon: 'Ticket',
      color: 'orange',
      shortDesc: 'Продаете туры за комиссию?',
      features: ['База клиентов', 'Ваучеры и скидки', 'Комиссионные', 'CRM', 'Статистика продаж'],
      href: '/hub/agent'
    },
    {
      id: 'admin',
      name: 'Админ',
      icon: 'Shield',
      color: 'red',
      shortDesc: 'Управляете платформой?',
      features: ['Управление пользователями', 'Модерация контента', 'Финансовая панель', 'Настройки системы', 'Аналитика'],
      href: '/hub/admin'
    }
  ];

  const platformStats = [
    { icon: 'Mountain', value: '100+', label: 'Туров' },
    { icon: 'Handshake', value: '50+', label: 'Партнеров' },
    { icon: 'Calendar', value: '500+', label: 'Бронирований' },
    { icon: 'Users', value: '1000+', label: 'Туристов' },
    { icon: 'Star', value: '4.9', label: 'Рейтинг' },
    { icon: 'Leaf', value: '5000+', label: 'Eco-points' }
  ];

  return (
    <main className="min-h-screen bg-premium-black text-white">
      {/* 1. HERO SECTION - Revolutionary */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 -z-10">
          <video 
            className="w-full h-full object-cover opacity-40" 
            autoPlay 
            muted 
            loop 
            playsInline 
            poster="https://images.unsplash.com/photo-1520496938500-76fd098ad75a?q=80&w=1920&auto=format&fit=crop"
          >
            <source src="https://cdn.coverr.co/videos/coverr-aurora-over-mountains-0157/1080p.mp4" type="video/mp4" />
          </video>
        </div>
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-premium-black -z-5"></div>
        <div className="absolute inset-0 gradient-gold-aurora animate-aurora -z-5"></div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-tight mb-6">
            Экосистема туризма <span className="text-premium-gold gold-glow">Камчатки</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Единая платформа для туристов, операторов, гидов, трансферов, агентов и администраторов
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <a 
              href="#tours" 
              className="px-8 py-4 bg-premium-gold hover:bg-premium-gold/90 text-premium-black font-bold text-lg rounded-xl transition-all hover:scale-105 shadow-lg"
            >
              Найти тур
            </a>
            <a 
              href="#roles" 
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold text-lg rounded-xl border border-white/20 transition-all hover:scale-105"
            >
              Стать партнером
            </a>
            <a 
              href="/auth/demo" 
              className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm text-white/90 font-bold text-lg rounded-xl border border-white/10 transition-all hover:scale-105"
            >
              Попробовать демо
            </a>
          </div>

          {/* Scroll Indicator */}
          <div className="flex flex-col items-center gap-2 text-white/60 animate-bounce">
            <span className="text-sm">Листайте вниз</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION - 3 Pillars */}
      <section className="px-6 py-20 bg-gradient-to-b from-premium-black to-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Pillar 1: Для туристов */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all hover:scale-105">
              <div className="text-5xl mb-4">✓</div>
              <h3 className="text-2xl font-bold mb-4">Для путешественников</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>100+ туров по Камчатке</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>AI-помощник в выборе</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Реальные отзывы и рейтинги</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Безопасность 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Система лояльности</span>
                </li>
              </ul>
              <a 
                href="/hub/tourist" 
                className="mt-6 block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-center transition-colors"
              >
                Найти тур →
              </a>
            </div>

            {/* Pillar 2: Для бизнеса */}
            <div className="bg-gradient-to-br from-premium-gold/20 to-premium-gold/5 border border-premium-gold/30 rounded-2xl p-8 hover:scale-105 transition-all">
              <div className="text-5xl mb-4">◆</div>
              <h3 className="text-2xl font-bold mb-4 text-premium-gold">Для туроператоров</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-premium-gold mt-1">✓</span>
                  <span>Автоматизация бронирований</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-premium-gold mt-1">✓</span>
                  <span>CRM и аналитика</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-premium-gold mt-1">✓</span>
                  <span>Календарь и расписание</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-premium-gold mt-1">✓</span>
                  <span>Финансовая статистика</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-premium-gold mt-1">✓</span>
                  <span>Управление гидами</span>
                </li>
              </ul>
              <a 
                href="/hub/operator" 
                className="mt-6 block w-full px-6 py-3 bg-premium-gold hover:bg-premium-gold/90 text-premium-black font-bold rounded-xl text-center transition-colors"
              >
                Стать оператором →
              </a>
            </div>

            {/* Pillar 3: Для партнеров */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all hover:scale-105">
              <div className="text-5xl mb-4">≡</div>
              <h3 className="text-2xl font-bold mb-4">Для партнеров</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Трансферы и логистика</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Гиды и экскурсии</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Агентская сеть</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Реферальная программа</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Комиссионные выплаты</span>
                </li>
              </ul>
              <a 
                href="#roles" 
                className="mt-6 block w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-center transition-colors border border-white/20"
              >
                Узнать больше →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ROLE SELECTOR - Interactive */}
      <section id="roles" className="px-6 py-20 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Кто вы? <span className="text-premium-gold">Выберите роль</span>
            </h2>
            <p className="text-xl text-white/70">
              Наведите на карточку, чтобы узнать больше
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`relative bg-white/5 border border-white/10 rounded-2xl p-6 transition-all duration-300 cursor-pointer ${
                  expandedRole === role.id ? 'bg-white/10 scale-105' : 'hover:bg-white/8'
                }`}
                onMouseEnter={() => setExpandedRole(role.id)}
                onMouseLeave={() => setExpandedRole(null)}
              >
                <div className="text-5xl mb-4">{role.icon}</div>
                <h3 className="text-2xl font-bold mb-2">{role.name}</h3>
                <p className="text-white/70 mb-4">{role.shortDesc}</p>

                {expandedRole === role.id && (
                  <div className="space-y-3 animate-fadeIn">
                    {role.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-premium-gold">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                    <a
                      href={role.href}
                      className="mt-4 block w-full px-6 py-3 bg-premium-gold hover:bg-premium-gold/90 text-premium-black font-bold rounded-xl text-center transition-colors"
                    >
                      Войти как {role.name.split(' ')[1]} →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURED TOURS */}
      <section id="tours" className="px-6 py-20 bg-gradient-to-b from-black to-premium-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Популярные <span className="text-premium-gold">туры</span>
            </h2>
            <a 
              href="/hub/tours" 
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Смотреть все →
            </a>
          </div>

          {loading ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/5 rounded-2xl h-80 animate-pulse"></div>
              ))}
            </div>
          ) : tours.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  onClick={() => console.log('Tour clicked:', tour.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-white/70 py-12">
              <div className="text-6xl mb-4">▲</div>
              <p className="text-xl">Туры скоро появятся</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. LIVE ECOSYSTEM - Real-time Dashboard */}
      {userLocation && (
        <section className="px-6 py-20 bg-premium-black">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
              Платформа в <span className="text-premium-gold">реальном времени</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <WeatherWidget
                lat={userLocation.lat}
                lng={userLocation.lng}
                location="Петропавловск-Камчатский"
                className="h-96"
              />
              
              <div className="bg-gradient-to-br from-premium-gold/20 to-premium-gold/5 border border-premium-gold/30 rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-6 text-premium-gold">Статистика платформы</h3>
                <div className="grid grid-cols-2 gap-4">
                  {platformStats.map((stat, idx) => (
                    <div key={idx} className="text-center p-4 bg-white/5 rounded-xl">
                      <div className="text-3xl mb-2">{stat.icon}</div>
                      <div className="text-3xl font-black text-premium-gold mb-1">{stat.value}</div>
                      <div className="text-sm text-white/70">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. AI ASSISTANT - Interactive Demo */}
      <section className="px-6 py-20 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                AI-помощник <span className="text-premium-gold">по Камчатке</span>
              </h2>
              <p className="text-xl text-white/80 mb-6">
                Наш AI знает всё о Камчатке и поможет выбрать идеальный тур под ваши предпочтения.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Бесплатно, без регистрации</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Персональные рекомендации</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Ответы на любые вопросы</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Актуальная погода и безопасность</span>
                </li>
              </ul>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span>Powered by</span>
                <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full font-semibold">
                  GROQ AI (Llama 3.1)
                </span>
              </div>
            </div>

            <div>
              <AIChatWidget
                userId="demo-user"
                className="w-full h-[500px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. SAFETY & ECO - Split Screen */}
      <section className="px-6 py-20 bg-gradient-to-b from-black to-premium-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Safety */}
            <div className="relative bg-red-900/20 border border-red-500/30 rounded-2xl p-8 overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-4">Безопасность</h3>
                <p className="text-white/80 mb-6">
                  Ваша безопасность — наш приоритет. SOS, МЧС, сейсмика — всё в одном месте.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <a href="/hub/safety" className="p-4 bg-red-600 hover:bg-red-700 rounded-xl text-center font-bold transition-colors">
                    SOS кнопка
                  </a>
                  <a href="/hub/safety" className="p-4 bg-white/10 hover:bg-white/20 rounded-xl text-center font-bold transition-colors">
                    МЧС Камчатка
                  </a>
                  <a href="/hub/safety" className="p-4 bg-white/10 hover:bg-white/20 rounded-xl text-center font-bold transition-colors">
                    Сейсмомониторинг
                  </a>
                  <a href="/hub/safety" className="p-4 bg-white/10 hover:bg-white/20 rounded-xl text-center font-bold transition-colors">
                    Вулканы онлайн
                  </a>
                </div>
                <a 
                  href="/hub/safety" 
                  className="block w-full px-6 py-3 bg-premium-gold hover:bg-premium-gold/90 text-premium-black font-bold rounded-xl text-center transition-colors"
                >
                  Узнать больше →
                </a>
              </div>
              <div className="absolute bottom-0 right-0 w-64 h-64 opacity-10">
                <img src="/graphics/kamchatka-button.svg" alt="" className="w-full h-full" />
              </div>
            </div>

            {/* Ecology */}
            <div className="relative bg-green-900/20 border border-green-500/30 rounded-2xl p-8 overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-4">Экология</h3>
                <p className="text-white/80 mb-6">
                  Собирайте Eco-points за бережное поведение и получайте скидки на туры.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-1">◆</div>
                    <div className="text-2xl font-bold text-green-400">5000+</div>
                    <div className="text-xs text-white/60">Points собрано</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-1">↻</div>
                    <div className="text-2xl font-bold text-green-400">200+</div>
                    <div className="text-xs text-white/60">Эко-туристов</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-1">□</div>
                    <div className="text-2xl font-bold text-green-400">500кг</div>
                    <div className="text-xs text-white/60">Мусора собрано</div>
                  </div>
                </div>
                <a 
                  href="/hub/tourist" 
                  className="block w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-center transition-colors"
                >
                  Присоединиться →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA - Call to Action */}
      <section className="px-6 py-20 bg-premium-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Готовы начать? <span className="text-premium-gold block mt-2">Выберите свою роль</span>
          </h2>
          <p className="text-xl text-white/70 mb-12">
            Присоединяйтесь к экосистеме туризма Камчатки уже сегодня
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {roles.slice(0, 5).map((role) => (
              <a
                key={role.id}
                href={role.href}
                className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:scale-105 group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{role.icon}</div>
                <div className="font-bold">{role.name}</div>
                <div className="text-sm text-white/60 mt-1">Войти →</div>
              </a>
            ))}
            <a
              href="/auth/demo"
              className="p-6 bg-gradient-to-br from-premium-gold/20 to-premium-gold/5 border border-premium-gold/30 rounded-xl transition-all hover:scale-105 group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">★</div>
              <div className="font-bold text-premium-gold">Демо</div>
              <div className="text-sm text-white/60 mt-1">Попробовать →</div>
            </a>
          </div>

          <div className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white/70 mb-4">Не уверены с чего начать?</p>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: document.querySelector('.ai-chat')?.getBoundingClientRect().top || 0, behavior: 'smooth' }); }}
              className="inline-block px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold transition-colors"
            >
              Пообщаться с AI-помощником →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
