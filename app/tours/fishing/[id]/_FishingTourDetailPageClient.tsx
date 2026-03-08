'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { TourBookingForm } from '@/components/booking/TourBookingForm';
import {
  Fish, MapPin, Clock, Users, Star,
  Check, AlertTriangle, Phone, Mail,
  ChevronLeft, Share2, Heart,
} from 'lucide-react';

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
  requirements: string[];
  included: string[];
  notIncluded: string[];
  maxGroupSize: number;
  minGroupSize: number;
  rating: number;
  reviewCount: number;
  images: string[];
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

const DIFFICULTY_LABELS: Record<string, { text: string; color: string }> = {
  easy:   { text: 'Лёгкий',  color: 'bg-green-500/20 text-green-400'  },
  medium: { text: 'Средний', color: 'bg-yellow-500/20 text-yellow-400' },
  hard:   { text: 'Сложный', color: 'bg-red-500/20 text-red-400'      },
};

export default function FishingTourDetailPageClient() {
  const params   = useParams();
  const router   = useRouter();
  const tourId   = params.id as string;

  const [tour, setTour]               = useState<ApiTour | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBooking, setShowBooking] = useState(false);

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

    fetchTour();
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
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-premium-gold/30 border-t-premium-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Загрузка тура...</p>
        </div>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">{error || 'Тур не найден'}</h2>
          <button
            onClick={() => router.push('/tours/fishing')}
            className="mt-4 px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors"
          >
            К рыболовным турам
          </button>
        </div>
      </div>
    );
  }

  const difficulty = DIFFICULTY_LABELS[tour.difficulty] ?? { text: tour.difficulty, color: 'bg-white/10 text-white/60' };
  const currentImage = tour.images[selectedImage] || null;

  return (
    <main className="min-h-screen text-white">
      {/* Шапка */}
      <div className="bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/tours/fishing"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Все рыболовные туры</span>
            </Link>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Основной контент */}
          <div className="lg:col-span-2 space-y-6">
            {/* Галерея */}
            <div className="space-y-3">
              {/* Главное фото */}
              <div className="aspect-video relative rounded-2xl overflow-hidden bg-white/10">
                {currentImage ? (
                  <Image
                    src={currentImage}
                    alt={tour.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-cyan-800 flex items-center justify-center">
                    <Fish className="w-24 h-24 text-white/20" />
                  </div>
                )}
              </div>

              {/* Миниатюры */}
              {tour.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {tour.images.slice(0, 4).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`aspect-video relative rounded-xl overflow-hidden border-2 transition-colors ${
                        selectedImage === i ? 'border-premium-gold' : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${tour.name} — фото ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="25vw"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Заголовок + бейджи */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${difficulty.color}`}>
                  {difficulty.text}
                </span>
                <span className="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 flex items-center gap-1">
                  <Fish className="w-4 h-4" />
                  Рыбалка
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">{tour.name}</h1>

              <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
                {tour.route && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-premium-gold" />
                    {tour.route.title}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-premium-gold fill-premium-gold" />
                  <span className="text-white font-semibold">{tour.rating.toFixed(1)}</span>
                  <span>({tour.reviewCount} отзывов)</span>
                </span>
              </div>
            </div>

            {/* Описание */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-3">О туре</h2>
              <p className="text-white/80 whitespace-pre-line leading-relaxed">{tour.description}</p>
            </div>

            {/* Маршрут */}
            {tour.route && (
              <div className="bg-premium-gold/10 border border-premium-gold/30 rounded-2xl p-5 flex items-start gap-4">
                <MapPin className="w-6 h-6 text-premium-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-premium-gold font-semibold text-sm uppercase tracking-wide mb-1">Маршрут</p>
                  <p className="text-white font-bold">{tour.route.title}</p>
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
                <h2 className="text-xl font-bold mb-4">Что включено</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tour.included.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-white/80 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Что взять */}
            {tour.requirements.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Что взять с собой</h2>
                <div className="space-y-2">
                  {tour.requirements.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                      <span className="text-white/80 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Форма бронирования (мобильная — под контентом) */}
            {showBooking && (
              <div className="lg:hidden bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-5">Забронировать тур</h2>
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
          <div className="space-y-5">
            {/* Бронирование */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 sticky top-6">
              <div className="text-center mb-5">
                <div className="text-4xl font-black text-premium-gold">
                  {tour.price.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-white/50 text-sm">за человека</div>
              </div>

              <div className="space-y-3 mb-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Длительность
                  </span>
                  <span className="text-white font-medium">{tour.duration} д.</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Группа
                  </span>
                  <span className="text-white font-medium">
                    {tour.minGroupSize}–{tour.maxGroupSize} чел.
                  </span>
                </div>
              </div>

              {/* Бронирование на десктопе */}
              <div className="hidden lg:block">
                <TourBookingForm
                  tourId={tourId}
                  tourName={tour.name}
                  price={tour.price}
                  onSubmit={handleBooking}
                />
              </div>

              {/* Кнопка для мобильных */}
              <button
                onClick={() => setShowBooking(!showBooking)}
                className="lg:hidden w-full py-4 bg-premium-gold hover:bg-premium-gold/80 rounded-xl font-bold text-premium-black transition-colors"
              >
                {showBooking ? 'Скрыть форму' : 'Забронировать'}
              </button>

              {/* Контакты оператора */}
              {tour.operator && (
                <div className="mt-4 flex gap-2">
                  {tour.operator.phone && (
                    <a
                      href={`tel:${tour.operator.phone}`}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      Позвонить
                    </a>
                  )}
                  {tour.operator.email && (
                    <a
                      href={`mailto:${tour.operator.email}`}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Карточка оператора */}
            {tour.operator && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h3 className="font-bold mb-4">Организатор</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-premium-gold/20 rounded-xl flex items-center justify-center shrink-0">
                    <Fish className="w-8 h-8 text-premium-gold" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{tour.operator.name}</p>
                    <p className="flex items-center gap-1 text-sm text-white/60">
                      <Star className="w-4 h-4 text-premium-gold fill-premium-gold" />
                      {tour.operator.rating.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
