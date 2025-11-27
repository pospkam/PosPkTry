'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tour, Review } from '@/types';
import { WeatherWidget } from '@/components/WeatherWidget';
import { TourBookingForm } from '@/components/booking/TourBookingForm';
import { LoadingSpinner } from '@/components/admin/shared';

export default function TourDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'reviews' | 'booking'>('overview');

  useEffect(() => {
    fetchTourDetails();
    fetchReviews();
  }, [tourId]);

  const fetchTourDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tours/${tourId}`);
      const result = await response.json();

      if (result.success) {
        setTour(result.data);
      } else {
        setError('Тур не найден');
      }
    } catch (err) {
      console.error('Error fetching tour:', err);
      setError('Ошибка загрузки тура');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?tourId=${tourId}`);
      const result = await response.json();
      if (result.success) {
        setReviews(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleBooking = async (bookingData: any) => {
    try {
      const response = await fetch(`/api/tours/${tourId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        return { id: result.data.bookingId };
      } else {
        throw new Error(result.error || 'Ошибка бронирования');
      }
    } catch (err) {
      console.error('Booking error:', err);
      throw err;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-white/70';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легкий';
      case 'medium': return 'Средний';
      case 'hard': return 'Сложный';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <LoadingSpinner message="Загрузка тура..." />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Тур не найден'}</p>
          <button
            onClick={() => router.push('/hub/tourist')}
            className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl font-semibold hover:bg-premium-gold/80 transition-colors"
          >
            Вернуться к турам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-premium-black to-premium-black/80 border-b border-white/15">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-white/70 hover:text-white flex items-center gap-2"
          >
            ← Назад
          </button>
          <h1 className="text-4xl font-black text-white mb-2">{tour.title}</h1>
          <div className="flex items-center gap-4 text-white/70">
            <span><Star className="w-4 h-4" /> {tour.rating.toFixed(1)} ({tour.reviewsCount} отзывов)</span>
            <span className={getDifficultyColor(tour.difficulty)}>
              • {getDifficultyText(tour.difficulty)}
            </span>
            <span>•  {tour.duration}</span>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="col-span-4 md:col-span-2 row-span-2">
            <img
              src={tour.images[0] || '/placeholder-tour.jpg'}
              alt={tour.title}
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
          {tour.images.slice(1, 5).map((img, idx) => (
            <div key={idx} className="col-span-2 md:col-span-1">
              <img
                src={img}
                alt={`${tour.title} ${idx + 2}`}
                className="w-full h-48 object-cover rounded-xl"
              />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/15">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`px-6 py-3 font-semibold transition-colors ${
              selectedTab === 'overview'
                ? 'text-white border-b-2 border-white/15'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Обзор
          </button>
          <button
            onClick={() => setSelectedTab('reviews')}
            className={`px-6 py-3 font-semibold transition-colors ${
              selectedTab === 'reviews'
                ? 'text-white border-b-2 border-white/15'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Отзывы ({reviews.length})
          </button>
          <button
            onClick={() => setSelectedTab('booking')}
            className={`px-6 py-3 font-semibold transition-colors ${
              selectedTab === 'booking'
                ? 'text-white border-b-2 border-white/15'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Бронирование
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Описание */}
                <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold mb-4">Описание тура</h2>
                  <p className="text-white/80 leading-relaxed whitespace-pre-line">
                    {tour.description}
                  </p>
                </div>

                {/* Что включено */}
                {tour.equipmentIncluded && tour.equipmentIncluded.length > 0 && (
                  <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                    <h2 className="text-2xl font-bold mb-4">Что включено</h2>
                    <ul className="space-y-2">
                      {tour.equipmentIncluded.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span className="text-white/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Что взять с собой */}
                {tour.equipmentRequired && tour.equipmentRequired.length > 0 && (
                  <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                    <h2 className="text-2xl font-bold mb-4">Что взять с собой</h2>
                    <ul className="space-y-2">
                      {tour.equipmentRequired.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-white">•</span>
                          <span className="text-white/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Требования безопасности */}
                {tour.safetyRequirements && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                    <h2 className="text-2xl font-bold mb-4 text-red-400">⚠️ Требования безопасности</h2>
                    <p className="text-white/80">{tour.safetyRequirements}</p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'reviews' && (
              <div className="space-y-4">
                <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold mb-6">Отзывы</h2>
                  
                  {reviews.length === 0 ? (
                    <p className="text-white/50 text-center py-8">Пока нет отзывов</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="bg-white/15 border border-white/15 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-yellow-400">
                                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                              </span>
                              <span className="text-white/70 text-sm">
                                {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                            {review.isVerified && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                ✓ Проверен
                              </span>
                            )}
                          </div>
                          <p className="text-white/80">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTab === 'booking' && (
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">Забронировать тур</h2>
                <TourBookingForm
                  tourId={tourId}
                  tourName={tour.title}
                  price={tour.priceFrom}
                  onSubmit={handleBooking}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Цена и кнопка */}
            <div className="bg-gradient-to-br from-premium-gold/20 to-premium-gold/10 border border-white/15/30 rounded-2xl p-6 sticky top-6">
              <div className="text-center mb-4">
                <p className="text-white/70 text-sm mb-1">от</p>
                <p className="text-4xl font-black text-white">
                  {tour.priceFrom.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-white/50 text-sm mt-1">за человека</p>
              </div>

              <button
                onClick={() => setSelectedTab('booking')}
                className="w-full px-6 py-4 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors text-lg"
              >
                Забронировать
              </button>

              {/* Характеристики */}
              <div className="mt-6 space-y-3 pt-6 border-t border-white/15">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Длительность</span>
                  <span className="text-white font-semibold">{tour.duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Сложность</span>
                  <span className={`font-semibold ${getDifficultyColor(tour.difficulty)}`}>
                    {getDifficultyText(tour.difficulty)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Группа</span>
                  <span className="text-white font-semibold">
                    {tour.minParticipants}-{tour.maxParticipants} чел
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Рейтинг</span>
                  <span className="text-yellow-400 font-semibold">
                    <Star className="w-4 h-4" /> {tour.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Оператор */}
            {tour.operator && (
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Организатор</h3>
                <div className="space-y-2">
                  <p className="text-white font-semibold">{tour.operator.name}</p>
                  <p className="text-white/70 text-sm">
                    <Star className="w-4 h-4" /> Рейтинг: {tour.operator.rating.toFixed(1)}
                  </p>
                  <div className="pt-4 space-y-2">
                    <a
                      href={`tel:${tour.operator.phone}`}
                      className="block text-white hover:underline text-sm"
                    >
                      📞 {tour.operator.phone}
                    </a>
                    <a
                      href={`mailto:${tour.operator.email}`}
                      className="block text-white hover:underline text-sm"
                    >
                      ✉️ {tour.operator.email}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Погода */}
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Погода на маршруте</h3>
              <WeatherWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

