'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { WeatherWidget } from '@/components/weather/WeatherWidget';
import { TourBookingForm } from '@/components/booking/TourBookingForm';
import { LoadingSpinner } from '@/components/admin/shared';
import {
  Star, MapPin, Clock, Users, Check, X,
  AlertTriangle, Phone, Mail, ChevronLeft,
  Sun, Moon, User,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import BottomNav from '@/components/shared/BottomNav';
import Link from 'next/link';

interface ApiTour {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  price: number;
  currency: string;
  season: unknown[];
  coordinates: unknown[];
  requirements: string[];
  included: string[];
  notIncluded: string[];
  maxGroupSize: number;
  minGroupSize: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  images: string[];
  slug: string;
  locationName: string;
  routeId: string | null;
  route: {
    id: string;
    title: string;
    category: string;
    lat: number | null;
    lng: number | null;
    sourceUrl: string | null;
  } | null;
  operator: {
    id: string;
    name: string;
    rating: number;
    phone: string;
    email: string;
  } | null;
}

interface ApiReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  isVerified?: boolean;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
};

type Tab = 'overview' | 'reviews' | 'booking';

export default function TourDetailsPageClient() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;
  const { isDark, toggleTheme } = useTheme();

  const [tour, setTour] = useState<ApiTour | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    const fetchTour = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tours/${tourId}`);
        const data = await res.json();
        if (data.success) {
          setTour(data.data as ApiTour);
        } else {
          setError(data.error || 'Тур не найден');
        }
      } catch {
        setError('Ошибка загрузки тура');
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews?tourId=${tourId}`);
        const data = await res.json();
        if (data.success) setReviews((data.data as ApiReview[]) || []);
      } catch {
        // reviews are optional — ignore error
      }
    };

    fetchTour();
    fetchReviews();
  }, [tourId]);

  const handleBooking = async (bookingData: unknown): Promise<{ id?: string }> => {
    const res = await fetch(`/api/tours/${tourId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Ошибка бронирования');
    return { id: result.data?.bookingId };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Загрузка тура..." />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">
            {error || 'Тур не найден'}
          </h2>
          <button
            onClick={() => router.push('/tours')}
            className="mt-4 px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors"
          >
            К списку туров
          </button>
        </div>
      </div>
    );
  }

  const heroImage = tour.images[0] || null;

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Standard header */}
      <header style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.15)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)", fontSize: '1.4rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
            KH
          </Link>
          <h1 className="text-lg font-bold text-white hidden sm:block">Детали тура</h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-white/70 hover:text-white transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/profile" className="text-white/70 hover:text-white transition-colors" aria-label="Личный кабинет">
              <User size={20} />
            </Link>
          </div>
        </div>
      </header>

      <div className="text-white">
      {/* Шапка */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{tour.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-semibold">{tour.rating.toFixed(1)}</span>
              <span>({tour.reviewCount} отзывов)</span>
            </span>
            <span className={DIFFICULTY_COLOR[tour.difficulty] || 'text-white/70'}>
              • {DIFFICULTY_LABEL[tour.difficulty] || tour.difficulty}
            </span>
            {tour.route && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-premium-gold" />
                {tour.route.title}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Галерея */}
        <div className="grid grid-cols-4 gap-3 mb-8 h-72 sm:h-96">
          {/* Главное фото */}
          <div className="col-span-4 md:col-span-2 relative rounded-2xl overflow-hidden bg-white/5">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={tour.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-premium-gold/20 to-white/5 flex items-center justify-center">
                <MapPin className="w-16 h-16 text-white/20" />
              </div>
            )}
          </div>

          {/* Дополнительные фото */}
          <div className="hidden md:grid col-span-2 grid-cols-2 gap-3">
            {tour.images.slice(1, 5).map((img, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden bg-white/5">
                <Image
                  src={img}
                  alt={`${tour.name} — фото ${i + 2}`}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </div>
            ))}
            {/* Заглушки если меньше 4 дополнительных */}
            {Array.from({ length: Math.max(0, 4 - tour.images.slice(1, 5).length) }).map((_, i) => (
              <div key={`placeholder-${i}`} className="rounded-xl bg-white/5" />
            ))}
          </div>
        </div>

        {/* Вкладки */}
        <div className="flex gap-1 mb-6 border-b border-white/15">
          {(['overview', 'reviews', 'booking'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
                activeTab === tab
                  ? 'text-white border-b-2 border-premium-gold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab === 'overview' && 'Обзор'}
              {tab === 'reviews' && `Отзывы (${reviews.length})`}
              {tab === 'booking' && 'Бронирование'}
            </button>
          ))}
        </div>

        {/* Контент + сайдбар */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Основной контент */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* Описание */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-3">Описание тура</h2>
                  <p className="text-white/80 leading-relaxed whitespace-pre-line">{tour.description}</p>
                </div>

                {/* Маршрут-баннер */}
                {tour.route && (
                  <div className="bg-premium-gold/10 border border-premium-gold/30 rounded-2xl p-5 flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-premium-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="text-premium-gold font-semibold text-sm uppercase tracking-wide mb-1">Маршрут</p>
                      <p className="text-white font-bold text-lg">{tour.route.title}</p>
                      <p className="text-white/60 text-sm capitalize">{tour.route.category}</p>
                      {tour.route.sourceUrl && (
                        <a
                          href={tour.route.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-premium-gold/70 hover:text-premium-gold mt-1 inline-block transition-colors"
                        >
                          Подробнее о маршруте →
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Что включено */}
                {tour.included.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4">Включено в тур</h2>
                    <ul className="space-y-2">
                      {tour.included.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          <span className="text-white/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Не включено */}
                {tour.notIncluded.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4">Не включено</h2>
                    <ul className="space-y-2">
                      {tour.notIncluded.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span className="text-white/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Требования / снаряжение */}
                {tour.requirements.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4">Что взять с собой</h2>
                    <ul className="space-y-2">
                      {tour.requirements.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-premium-gold mt-0.5">•</span>
                          <span className="text-white/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {activeTab === 'reviews' && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-6">Отзывы</h2>
                {reviews.length === 0 ? (
                  <p className="text-white/50 text-center py-8">Пока нет отзывов</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex text-yellow-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'fill-current' : ''}`}
                                strokeWidth={1.5}
                              />
                            ))}
                          </span>
                          <span className="text-white/50 text-xs">
                            {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        {review.isVerified && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded mb-2">
                            <Check className="w-3 h-3" /> Проверен
                          </span>
                        )}
                        <p className="text-white/80 text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'booking' && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-6">Забронировать тур</h2>
                <TourBookingForm
                  tourId={tourId}
                  tourName={tour.name}
                  price={tour.price}
                  onSubmit={handleBooking}
                />
              </div>
            )}
          </div>

          {/* Сайдбар */}
          <div className="space-y-6">
            {/* Цена + CTA */}
            <div className="bg-gradient-to-br from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-2xl p-6 sticky top-6">
              <div className="text-center mb-5">
                <p className="text-white/60 text-sm mb-1">от</p>
                <p className="text-4xl font-black text-white">
                  {tour.price.toLocaleString('ru-RU')} {tour.currency === 'RUB' ? '₽' : tour.currency}
                </p>
                <p className="text-white/50 text-sm mt-1">за человека</p>
              </div>

              <button
                onClick={() => setActiveTab('booking')}
                className="w-full px-6 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors text-base"
              >
                Забронировать
              </button>

              {/* Параметры */}
              <div className="mt-5 space-y-3 pt-5 border-t border-white/15">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <Clock className="w-4 h-4" /> Длительность
                  </span>
                  <span className="text-white font-semibold">{tour.duration} д.</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Сложность</span>
                  <span className={`font-semibold ${DIFFICULTY_COLOR[tour.difficulty] || ''}`}>
                    {DIFFICULTY_LABEL[tour.difficulty] || tour.difficulty}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <Users className="w-4 h-4" /> Группа
                  </span>
                  <span className="text-white font-semibold">
                    {tour.minGroupSize}–{tour.maxGroupSize} чел.
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Рейтинг</span>
                  <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                    <Star className="w-4 h-4 fill-current" />
                    {tour.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Оператор */}
            {tour.operator && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h3 className="text-base font-bold mb-4">Организатор</h3>
                <p className="text-white font-semibold mb-1">{tour.operator.name}</p>
                <p className="text-white/60 text-sm flex items-center gap-1 mb-4">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  {tour.operator.rating.toFixed(1)}
                </p>
                <div className="space-y-2">
                  {tour.operator.phone && (
                    <a
                      href={`tel:${tour.operator.phone}`}
                      className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
                    >
                      <Phone className="w-4 h-4 text-premium-gold shrink-0" />
                      {tour.operator.phone}
                    </a>
                  )}
                  {tour.operator.email && (
                    <a
                      href={`mailto:${tour.operator.email}`}
                      className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
                    >
                      <Mail className="w-4 h-4 text-premium-gold shrink-0" />
                      {tour.operator.email}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Погода */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
              <h3 className="text-base font-bold mb-4">Погода на маршруте</h3>
              <WeatherWidget
                lat={tour.route?.lat ?? undefined}
                lng={tour.route?.lng ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      <BottomNav activePath="/tours" />
    </div>
  );
}
