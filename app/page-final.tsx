'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tour, Partner } from '@/types';
import { FloatingNav } from '@/components/FloatingNav';
import Link from 'next/link';

export default function FinalHomePage() {
  const [stats, setStats] = useState({ tours: 0, partners: 0, tourists: 0, rating: 0 });
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [tours, setTours] = useState<Tour[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherData, setWeatherData] = useState<any>(null);
  
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    fetchData();
    fetchWeather();
    setupScrollReveal();
  }, []);

  const fetchData = async () => {
    try {
      const toursRes = await fetch('/api/tours?limit=6');
      const toursData = await toursRes.json();
      if (toursData.success) {
        setTours(toursData.data?.tours || []);
      }

      const partnersRes = await fetch('/api/partners');
      const partnersData = await partnersRes.json();
      if (partnersData.success) {
        setPartners(partnersData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather?lat=53.0&lng=158.65');
      const data = await res.json();
      if (data.success) {
        setWeatherData(data.data);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  const setupScrollReveal = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          
          if (entry.target === statsRef.current && !statsAnimated) {
            animateStats();
            setStatsAnimated(true);
          }
        }
      });
    }, { threshold: 0.1 });

    setTimeout(() => {
      document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
      });
      
      if (statsRef.current) observer.observe(statsRef.current);
    }, 100);
  };

  const animateStats = () => {
    const targets = { tours: 25, partners: 52, tourists: 350, rating: 4.9 };
    const duration = 2000;
    const frames = 60;
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      const progress = frame / frames;
      const eased = 1 - Math.pow(1 - progress, 4);

      setStats({
        tours: Math.round(targets.tours * eased),
        partners: Math.round(targets.partners * eased),
        tourists: Math.round(targets.tourists * eased),
        rating: parseFloat((targets.rating * eased).toFixed(1)),
      });

      if (frame === frames) {
        clearInterval(interval);
        setStats(targets);
      }
    }, duration / frames);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const getWeatherStatus = () => {
    if (!weatherData) return { label: 'Загрузка...', color: 'gray', icon: 'circle-check' };
    
    const temp = weatherData.temperature;
    const windSpeed = weatherData.windSpeed || 0;
    
    if (temp < -20 || windSpeed > 20) {
      return { label: 'ОПАСНО', color: 'red', icon: 'circle-alert' };
    } else if (temp < -10 || windSpeed > 15) {
      return { label: 'СЛОЖНО', color: 'orange', icon: 'circle-alert' };
    } else if (temp < 0 || windSpeed > 10) {
      return { label: 'ХОРОШО', color: 'yellow', icon: 'circle-check' };
    }
    return { label: 'ОТЛИЧНО', color: 'green', icon: 'circle-check' };
  };

  const weatherStatus = getWeatherStatus();

  return (
    <main className="final-homepage">
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="theme-toggle-pro"
        title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {theme === 'light' ? (
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          ) : (
            <>
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </>
          )}
        </svg>
      </button>

      {/* HERO SECTION */}
      <section className="hero-professional">
        <div className="hero-content-pro">
          <div className="hero-badge">
            <img src="/icons/volcano.svg" alt="" width="20" height="20" />
            Экосистема туризма Камчатки
          </div>
          
          <h1 className="hero-title-pro">
            Туры • Трансферы • Размещение
          </h1>
          
          <p className="hero-subtitle-pro">
            Всё для вашего путешествия на Камчатку в одном месте
          </p>

          {/* ПОИСК */}
          <div className="search-box-pro">
            <div className="search-container-pro">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Куда вы хотите отправиться? (вулкан, рыбалка, медведи...)"
                  className="search-input-pro"
                />
                <Link href="/search" className="search-btn-pro">
                  Найти туры
                </Link>
              </div>
            </div>
          </div>

          {/* СТАТИСТИКА */}
          <div ref={statsRef} className="hero-stats fade-in">
            <div className="stat-item-pro">
              <div className="stat-value-pro">{stats.tours}+</div>
              <div className="stat-label-pro">Туров</div>
            </div>
            <div className="stat-item-pro">
              <div className="stat-value-pro">{stats.partners}</div>
              <div className="stat-label-pro">Партнёров</div>
            </div>
            <div className="stat-item-pro">
              <div className="stat-value-pro">{stats.tourists}+</div>
              <div className="stat-label-pro">Туристов</div>
            </div>
            <div className="stat-item-pro">
              <div className="stat-value-pro">{stats.rating}</div>
              <div className="stat-label-pro">Рейтинг</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 ИННОВАЦИОННЫХ ФИЧ */}
      <section className="section-pro innovations-section fade-in">
        <div className="section-header-pro">
          <h2 className="section-title-pro">5 уникальных возможностей</h2>
          <p className="section-subtitle-pro">
            Технологии, которых нет у конкурентов
          </p>
        </div>

        <div className="innovations-grid">
          <div className="innovation-card">
            <div className="innovation-icon">
              <img src="/icons/ai-chip.svg" alt="AI" width="40" height="40" />
            </div>
            <h3 className="innovation-title">AI-Powered Matching</h3>
            <p className="innovation-description">
              Умный подбор водителей по 5 критериям: рейтинг (30%), цена (25%), расстояние (20%), доступность (15%), опыт (10%)
            </p>
            <div className="innovation-meta">
              <span className="meta-badge">{'<500ms'}</span>
              <span className="meta-badge">Топ-5 водителей</span>
              <span className="meta-badge">95%+ точность</span>
            </div>
          </div>

          <div className="innovation-card">
            <div className="innovation-icon">
              <img src="/icons/gift.svg" alt="Loyalty" width="40" height="40" />
            </div>
            <h3 className="innovation-title">Multi-Level Loyalty</h3>
            <p className="innovation-description">
              5 уровней лояльности (Новичок → Платина) с прогрессивной скидкой 0-15%, автоначисление 1% от заказа
            </p>
            <div className="innovation-meta">
              <span className="meta-badge">5 уровней</span>
              <span className="meta-badge">До 15% скидка</span>
              <span className="meta-badge">Промокоды</span>
            </div>
          </div>

          <div className="innovation-card">
            <div className="innovation-icon">
              <img src="/icons/bell-ring.svg" alt="Notifications" width="40" height="40" />
            </div>
            <h3 className="innovation-title">Multi-Channel Notifications</h3>
            <p className="innovation-description">
              3 канала уведомлений одновременно: SMS (SMS.ru), Email (AWS SES), Telegram (Bot API) с 6 автотриггерами
            </p>
            <div className="innovation-meta">
              <span className="meta-badge">SMS</span>
              <span className="meta-badge">Email</span>
              <span className="meta-badge">Telegram</span>
            </div>
          </div>

          <div className="innovation-card">
            <div className="innovation-icon">
              <img src="/icons/leaf.svg" alt="Eco" width="40" height="40" />
            </div>
            <h3 className="innovation-title">Eco-Gamification</h3>
            <p className="innovation-description">
              4 категории эко-точек, 5 достижений (10→1000 баллов), QR-сканирование, геолокация через PostGIS
            </p>
            <div className="innovation-meta">
              <span className="meta-badge">4 категории</span>
              <span className="meta-badge">QR-код</span>
              <span className="meta-badge">Геймификация</span>
            </div>
          </div>

          <div className="innovation-card">
            <div className="innovation-icon">
              <img src="/icons/cloud-sun.svg" alt="Weather" width="40" height="40" />
            </div>
            <h3 className="innovation-title">Weather-Driven Safety</h3>
            <p className="innovation-description">
              4 уровня безопасности, проверка каждый час, межоператорские автозамены при опасной погоде
            </p>
            <div className="innovation-meta">
              <span className="meta-badge">Авточеки</span>
              <span className="meta-badge">Автозамены</span>
              <span className="meta-badge">Возврат средств</span>
            </div>
          </div>
        </div>
      </section>

      {/* ПОПУЛЯРНЫЕ ТУРЫ */}
      <section className="section-pro fade-in">
        <div className="section-header-pro">
          <h2 className="section-title-pro">Популярные туры</h2>
          <p className="section-subtitle-pro">
            Исследуйте вулканы, океан и дикую природу с профессиональными гидами
          </p>
        </div>

        <div className="tours-grid">
          {tours.length > 0 ? (
            tours.map((tour) => (
              <div key={tour.id} className="tour-card-pro">
                <div className="tour-image-pro">
                  <img 
                    src={tour.images[0] || '/placeholder-tour.jpg'} 
                    alt={tour.title}
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-tour.jpg';
                    }}
                  />
                  <div className="tour-badge-pro">Популярный</div>
                  <div className="tour-rating-pro">
                    <img src="/icons/star.svg" alt="rating" width="16" height="16" />
                    {tour.rating}
                  </div>
                </div>
                <div className="tour-content-pro">
                  <h3 className="tour-title-pro">{tour.title}</h3>
                  <p className="tour-description-pro">{tour.description}</p>
                  <div className="tour-footer-pro">
                    <div className="tour-price-pro">от {tour.priceFrom.toLocaleString()} ₽</div>
                    <div className="tour-duration-pro">{tour.duration}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="tour-card-pro">
                <div className="tour-image-pro" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <div className="tour-badge-pro">Хит</div>
                  <div className="tour-rating-pro">
                    <img src="/icons/star.svg" alt="rating" width="16" height="16" />
                    4.9
                  </div>
                </div>
                <div className="tour-content-pro">
                  <h3 className="tour-title-pro">Восхождение на Авачинский вулкан</h3>
                  <p className="tour-description-pro">
                    Незабываемое восхождение на действующий вулкан с потрясающими видами
                  </p>
                  <div className="tour-footer-pro">
                    <div className="tour-price-pro">от 8 500 ₽</div>
                    <div className="tour-duration-pro">1 день</div>
                  </div>
                </div>
              </div>

              <div className="tour-card-pro">
                <div className="tour-image-pro" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <div className="tour-badge-pro">Популярный</div>
                  <div className="tour-rating-pro">
                    <img src="/icons/star.svg" alt="rating" width="16" height="16" />
                    5.0
                  </div>
                </div>
                <div className="tour-content-pro">
                  <h3 className="tour-title-pro">Долина гейзеров</h3>
                  <p className="tour-description-pro">
                    Вертолётная экскурсия в одно из чудес России
                  </p>
                  <div className="tour-footer-pro">
                    <div className="tour-price-pro">от 35 000 ₽</div>
                    <div className="tour-duration-pro">1 день</div>
                  </div>
                </div>
              </div>

              <div className="tour-card-pro">
                <div className="tour-image-pro" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  <div className="tour-badge-pro">Новый</div>
                  <div className="tour-rating-pro">
                    <img src="/icons/star.svg" alt="rating" width="16" height="16" />
                    4.8
                  </div>
                </div>
                <div className="tour-content-pro">
                  <h3 className="tour-title-pro">Наблюдение за медведями</h3>
                  <p className="tour-description-pro">
                    Курильское озеро - встреча с бурыми медведями в дикой природе
                  </p>
                  <div className="tour-footer-pro">
                    <div className="tour-price-pro">от 45 000 ₽</div>
                    <div className="tour-duration-pro">2 дня</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 10 ТИПОВ ПАРТНЁРОВ */}
      <section className="section-pro partners-types-section fade-in">
        <div className="section-header-pro">
          <h2 className="section-title-pro">Полная экосистема - 10 типов партнёров</h2>
          <p className="section-subtitle-pro">
            Присоединяйтесь к крупнейшей туристической платформе Камчатки
          </p>
        </div>

        <div className="partner-types-grid">
          <div className="partner-type-card">
            <img src="/icons/user.svg" alt="Турист" width="32" height="32" />
            <h3>Турист</h3>
            <p>Найдите идеальный тур, трансфер или размещение</p>
          </div>

          <div className="partner-type-card featured">
            <img src="/icons/building.svg" alt="Оператор" width="32" height="32" />
            <h3>Туроператор</h3>
            <p>3 уровня: L1 (бесплатно), L2 (5K), L3 (15K)</p>
            <div className="levels-badges">
              <img src="/icons/badge-1.svg" alt="L1" width="20" height="20" title="L1 - Базовый" />
              <img src="/icons/badge-2.svg" alt="L2" width="20" height="20" title="L2 - Партнёр" />
              <img src="/icons/badge-3.svg" alt="L3" width="20" height="20" title="L3 - Официальный" />
            </div>
          </div>

          <div className="partner-type-card">
            <img src="/icons/backpack.svg" alt="Гид" width="32" height="32" />
            <h3>Гид</h3>
            <p>Проводите туры, получайте больше заказов</p>
          </div>

          <div className="partner-type-card">
            <img src="/icons/car.svg" alt="Трансфер" width="32" height="32" />
            <h3>Трансфер</h3>
            <p>AI-подбор клиентов, 75% от стоимости</p>
          </div>

          <div className="partner-type-card featured">
            <img src="/icons/briefcase.svg" alt="Агент" width="32" height="32" />
            <h3>Агент (B2B)</h3>
            <p>GDS, White Label, групповые туры</p>
          </div>

          <div className="partner-type-card">
            <img src="/icons/settings.svg" alt="Админ" width="32" height="32" />
            <h3>Администратор</h3>
            <p>Управление экосистемой, межоператорские партнёрства</p>
          </div>

          <div className="partner-type-card">
            <img src="/icons/hotel.svg" alt="Размещение" width="32" height="32" />
            <h3>Размещение</h3>
            <p>Отели, хостелы, гостевые дома</p>
          </div>

          <div className="partner-type-card">
            <img src="/icons/tent.svg" alt="Снаряжение" width="32" height="32" />
            <h3>Прокат снаряжения</h3>
            <p>Рюкзаки, палатки, экипировка</p>
          </div>

          <div className="partner-type-card">
            <img src="/icons/key.svg" alt="Авто" width="32" height="32" />
            <h3>Прокат авто</h3>
            <p>Внедорожники, микроавтобусы</p>
          </div>

          <div className="partner-type-card">
            <img src="/icons/shopping-bag.svg" alt="Сувениры" width="32" height="32" />
            <h3>Сувениры</h3>
            <p>Подарки и сувениры Камчатки</p>
          </div>
        </div>
      </section>

      {/* 3 УРОВНЯ ОПЕРАТОРОВ */}
      <section className="section-pro operator-levels-section fade-in">
        <div className="section-header-pro">
          <h2 className="section-title-pro">Для туроператоров - 3 уровня партнёрства</h2>
          <p className="section-subtitle-pro">
            Выберите подходящий тариф для масштабирования бизнеса
          </p>
        </div>

        <div className="operator-levels-grid">
          <div className="operator-level-card">
            <div className="level-badge">
              <img src="/icons/badge-1.svg" alt="L1" width="48" height="48" />
            </div>
            <h3 className="level-title">L1 - Базовый</h3>
            <div className="level-price">Бесплатно</div>
            <ul className="level-features">
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Создание туров</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Управление слотами</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Базовые отчёты</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Личный кабинет</li>
            </ul>
            <Link href="/auth/login?level=1" className="level-cta">
              Начать бесплатно
            </Link>
          </div>

          <div className="operator-level-card featured">
            <div className="popular-badge">Популярный</div>
            <div className="level-badge">
              <img src="/icons/badge-2.svg" alt="L2" width="48" height="48" />
            </div>
            <h3 className="level-title">L2 - Партнёр</h3>
            <div className="level-price">5,000 ₽<span>/мес</span></div>
            <ul className="level-features">
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Всё из L1 +</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Обработка лидов</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Платёжная система</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Чат с клиентами</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Расширенная аналитика</li>
            </ul>
            <Link href="/auth/login?level=2" className="level-cta">
              Подключить
            </Link>
          </div>

          <div className="operator-level-card">
            <div className="level-badge">
              <img src="/icons/badge-3.svg" alt="L3" width="48" height="48" />
            </div>
            <h3 className="level-title">L3 - Официальный</h3>
            <div className="level-price">15,000 ₽<span>/мес</span></div>
            <ul className="level-features">
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Всё из L1 + L2 +</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> AI-ассистент</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Мобильное приложение</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> API интеграции (GDS)</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> White Label</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Приоритетная поддержка</li>
            </ul>
            <Link href="/auth/login?level=3" className="level-cta">
              Стать партнёром
            </Link>
          </div>
        </div>
      </section>

      {/* БЕЗОПАСНОСТЬ И ПОГОДА */}
      <section className="section-pro safety-weather-section fade-in">
        <div className="section-header-pro">
          <h2 className="section-title-pro">Безопасность 24/7 + Погодный интеллект</h2>
          <p className="section-subtitle-pro">
            Ваша безопасность - наш приоритет
          </p>
        </div>

        <div className="safety-weather-grid">
          <div className="safety-card">
            <div className="safety-icon">
              <img src="/icons/shield-check.svg" alt="Safety" width="48" height="48" />
            </div>
            <h3>SOS-система</h3>
            <ul>
              <li><img src="/icons/alert-circle.svg" alt="" width="16" height="16" /> Экстренная кнопка SOS</li>
              <li><img src="/icons/map-pin.svg" alt="" width="16" height="16" /> Автоматическая геолокация</li>
              <li><img src="/icons/phone.svg" alt="" width="16" height="16" /> МЧС: 112 • Полиция: 102</li>
            </ul>
            <Link href="/hub/safety" className="safety-link">
              Подробнее →
            </Link>
          </div>

          <div className="weather-card">
            <div className="weather-status" data-status={weatherStatus.color}>
              <img src={`/icons/${weatherStatus.icon}.svg`} alt="" width="32" height="32" />
              <div className="weather-info">
                <div className="weather-label">{weatherStatus.label}</div>
                {weatherData && (
                  <div className="weather-temp">
                    {weatherData.temperature > 0 ? '+' : ''}{weatherData.temperature}°C
                  </div>
                )}
              </div>
            </div>
            <h3>Weather-Driven Safety</h3>
            <ul>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Проверка каждый час</li>
              <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> 4 уровня безопасности</li>
              <li><img src="/icons/handshake.svg" alt="" width="16" height="16" /> Автозамены между операторами</li>
              <li><img src="/icons/coins.svg" alt="" width="16" height="16" /> Автоматический возврат средств</li>
            </ul>
          </div>
        </div>
      </section>

      {/* МЕЖОПЕРАТОРСКИЕ ПАРТНЁРСТВА */}
      <section className="section-pro partnerships-section fade-in">
        <div className="section-header-pro">
          <h2 className="section-title-pro">Межоператорские партнёрства</h2>
          <p className="section-subtitle-pro">
            Уникальная система, которой нет ни у кого в России
          </p>
        </div>

        <div className="partnerships-content">
          <div className="partnership-hero">
            <img src="/icons/handshake.svg" alt="Partnership" width="80" height="80" />
            <h3>Автоматические замены при плохой погоде</h3>
            <p>
              При опасных погодных условиях система автоматически ищет альтернативный тур у других операторов-партнёров. 
              Турист доволен, операторы получают дополнительных клиентов!
            </p>
          </div>

          <div className="partnership-features">
            <div className="partnership-feature">
              <h4>3 уровня партнёрства</h4>
              <ul>
                <li>Базовое: обмен информацией о турах</li>
                <li>Расширенное: совместные маршруты + общая база гидов</li>
                <li>Полное: единая система бронирования</li>
              </ul>
            </div>

            <div className="partnership-feature">
              <h4>Финансовые модели</h4>
              <ul>
                <li>Комиссионная: 10-15% за замену</li>
                <li>Взаимная: без комиссий, балансировка в год</li>
                <li>Гибридная: комбинация моделей</li>
              </ul>
            </div>

            <div className="partnership-feature">
              <h4>Выгоды</h4>
              <ul>
                <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Больше клиентов от партнёров</li>
                <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Меньше отмен</li>
                <li><img src="/icons/circle-check.svg" alt="" width="16" height="16" /> Стабильная загрузка</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* БИЗНЕС-МОДЕЛЬ */}
      <section className="section-pro business-model-section fade-in">
        <div className="section-header-pro">
          <h2 className="section-title-pro">Честные условия</h2>
          <p className="section-subtitle-pro">
            Прозрачная бизнес-модель без скрытых комиссий
          </p>
        </div>

        <div className="business-model-grid">
          <div className="business-model-card">
            <div className="model-icon">
              <img src="/icons/car.svg" alt="Transfer" width="40" height="40" />
            </div>
            <h3>Трансферы</h3>
            <div className="commission-breakdown">
              <div className="commission-item">
                <span className="commission-label">Водитель</span>
                <span className="commission-value">75%</span>
                <span className="commission-amount">7,500 ₽</span>
              </div>
              <div className="commission-item">
                <span className="commission-label">Оператор</span>
                <span className="commission-value">10%</span>
                <span className="commission-amount">1,000 ₽</span>
              </div>
              <div className="commission-item">
                <span className="commission-label">Платформа</span>
                <span className="commission-value">15%</span>
                <span className="commission-amount">1,500 ₽</span>
              </div>
            </div>
            <div className="total-amount">Стоимость для клиента: 10,000 ₽</div>
          </div>

          <div className="business-model-card">
            <div className="model-icon">
              <img src="/icons/tours.svg" alt="Tours" width="40" height="40" />
            </div>
            <h3>Туры</h3>
            <div className="commission-simple">
              <div className="commission-rate">10-20%</div>
              <div className="commission-note">Самая низкая комиссия на рынке</div>
            </div>
          </div>

          <div className="business-model-card">
            <div className="model-icon">
              <img src="/icons/building.svg" alt="Operators" width="40" height="40" />
            </div>
            <h3>Подписки операторов</h3>
            <ul className="subscription-list">
              <li>L1: Бесплатно</li>
              <li>L2: 5,000 ₽/мес</li>
              <li>L3: 15,000 ₽/мес</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ПАРТНЁРЫ */}
      <section className="partners-section fade-in">
        <div className="section-header-pro">
          <h2 className="section-title-pro">Наши партнёры</h2>
        </div>

        <div className="partners-grid">
          {partners.length > 0 ? (
            partners.map((partner) => (
              <div key={partner.id} className="partner-logo">
                <img 
                  src={partner.logo?.url || '/placeholder-logo.png'} 
                  alt={partner.name}
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-logo.png';
                  }}
                />
              </div>
            ))
          ) : (
            <div className="partners-info">
              2 туроператора • 1 размещение • 1 сувениры • Аренда
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-pro">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Для туристов</h3>
            <ul>
              <li><Link href="/tours">Туры</Link></li>
              <li><Link href="/search">Поиск</Link></li>
              <li><Link href="/transfers">Трансферы</Link></li>
              <li><Link href="/hub/safety">Безопасность</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Для бизнеса</h3>
            <ul>
              <li><Link href="/auth/login">Операторам</Link></li>
              <li><Link href="/partner/register">Партнёрам</Link></li>
              <li><Link href="/auth/login?role=agent">Агентам (B2B)</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>О платформе</h3>
            <ul>
              <li><Link href="/about">О проекте</Link></li>
              <li><Link href="/contacts">Контакты</Link></li>
              <li>6 ролей • 32 таблицы БД • 23 API</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          © 2025 Kamchatka Tour Hub. Полная экосистема туризма Камчатки.
        </div>
      </footer>

      <FloatingNav />
    </main>
  );
}
