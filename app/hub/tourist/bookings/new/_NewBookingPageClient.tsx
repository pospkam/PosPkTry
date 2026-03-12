'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface TourInfo {
  id: string;
  name: string;
  description: string;
  duration: number;
  difficulty: string;
  price: number;
  currency: string;
  images: string[];
  minGroupSize: number;
  maxGroupSize: number;
}

interface DepartureInfo {
  id: string;
  tourId: string;
  startDate: string;
  endDate: string | null;
  spotsLeft: number;
  availableSlots: number;
  price: number;
  minGroupSize: number;
  notes: string | null;
}

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const tourId = searchParams.get('tourId');
  const departureId = searchParams.get('departureId');
  const peopleParam = searchParams.get('people');

  const [tour, setTour] = useState<TourInfo | null>(null);
  const [departure, setDeparture] = useState<DepartureInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    participants: peopleParam ? parseInt(peopleParam, 10) : 1,
    specialRequests: '',
  });

  useEffect(() => {
    if (!tourId) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        // Fetch tour
        const tourRes = await fetch(`/api/tours/${tourId}`);
        const tourData = await tourRes.json();
        if (tourData.success) {
          setTour(tourData.data as TourInfo);
        }

        // Fetch departure if provided
        if (departureId) {
          const depRes = await fetch(`/api/tours/${tourId}/departures/${departureId}`);
          const depData = await depRes.json();
          if (depData.success && depData.data) {
            const dep = depData.data as DepartureInfo;
            setDeparture(dep);
            setFormData(prev => ({
              ...prev,
              date: dep.startDate,
              participants: peopleParam
                ? Math.min(parseInt(peopleParam, 10), dep.spotsLeft)
                : Math.max(dep.minGroupSize, 1),
            }));
          }
        }
      } catch {
        toast.error('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [tourId, departureId, peopleParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Необходимо войти в систему');
      router.push('/auth/login');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        tourId,
        participants: formData.participants,
        specialRequests: formData.specialRequests || undefined,
      };
      if (departureId) {
        payload.departureId = departureId;
      } else {
        payload.date = formData.date;
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Бронирование создано! Ожидайте подтверждения.');
        router.push('/hub/tourist/bookings');
      } else {
        toast.error(result.error || 'Ошибка при создании бронирования');
      }
    } catch {
      toast.error('Ошибка при создании бронирования');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-premium-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!tourId || !tour) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Тур не найден</h2>
          <button
            onClick={() => router.push('/tours')}
            className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold"
          >
            К списку туров
          </button>
        </div>
      </div>
    );
  }

  const pricePerPerson = departure?.price ?? tour.price;
  const totalPrice = pricePerPerson * formData.participants;
  const maxParticipants = departure ? departure.spotsLeft : tour.maxGroupSize;
  const minParticipants = departure ? departure.minGroupSize : (tour.minGroupSize || 1);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-white/70 hover:text-white mb-4 flex items-center space-x-2"
          >
            <span>←</span>
            <span>Назад</span>
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Новое бронирование</h1>
          <p className="text-white/70">Заполните форму для бронирования тура</p>
        </div>

        {/* Tour Info */}
        <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
          <div className="flex items-start space-x-6">
            {tour.images && tour.images.length > 0 && (
              <div className="w-32 h-32 rounded-xl relative overflow-hidden flex-shrink-0">
                <Image
                  src={tour.images[0]}
                  alt={tour.name}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{tour.name}</h2>
              <p className="text-white/70 mb-4 line-clamp-2">{tour.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                <span>Длительность: {tour.duration} ч.</span>
                <span>•</span>
                <span>Сложность: {tour.difficulty}</span>
                <span>•</span>
                <span className="text-premium-gold font-bold">
                  {pricePerPerson.toLocaleString('ru-RU')}₽ / чел.
                </span>
              </div>

              {/* Departure info badge */}
              {departure && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-400/10 border border-green-400/30 rounded-lg text-sm text-green-400">
                  <span>📅</span>
                  <span>
                    Заезд:{' '}
                    {new Date(departure.startDate).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {departure.endDate && (
                      <> — {new Date(departure.endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</>
                    )}
                  </span>
                  <span className="text-white/40">&bull;</span>
                  <span>Свободно: {departure.spotsLeft} мест</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="space-y-6">
            {/* Date */}
            <div>
              <label htmlFor="booking-date" className="block text-sm font-medium text-white mb-2">
                Дата тура {!departure && '*'}
              </label>
              {departure ? (
                <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm">
                  {new Date(departure.startDate).toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {departure.notes && (
                    <span className="block text-white/40 text-xs mt-1 italic">{departure.notes}</span>
                  )}
                </div>
              ) : (
                <input
                  id="booking-date"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                />
              )}
            </div>

            {/* Participants */}
            <div>
              <label htmlFor="booking-participants" className="block text-sm font-medium text-white mb-2">
                Количество участников *
              </label>
              <input
                id="booking-participants"
                type="number"
                required
                min={minParticipants}
                max={maxParticipants}
                value={formData.participants}
                onChange={(e) => setFormData({ ...formData, participants: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
              <p className="text-white/50 text-sm mt-1">
                Минимум: {minParticipants},
                Максимум: {maxParticipants}
                {departure && ' (свободных мест)'}
              </p>
            </div>

            {/* Special Requests */}
            <div>
              <label htmlFor="booking-requests" className="block text-sm font-medium text-white mb-2">
                Особые пожелания
              </label>
              <textarea
                id="booking-requests"
                rows={4}
                value={formData.specialRequests}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                placeholder="Укажите любые особые пожелания или требования..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
              />
            </div>

            {/* Total Price */}
            <div className="bg-premium-gold/10 rounded-xl p-4 border border-premium-gold/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white text-lg">Общая стоимость:</span>
                  {formData.participants > 1 && (
                    <p className="text-white/50 text-xs mt-0.5">
                      {pricePerPerson.toLocaleString('ru-RU')}₽ × {formData.participants} чел.
                    </p>
                  )}
                </div>
                <span className="text-premium-gold text-2xl font-bold">
                  {totalPrice.toLocaleString('ru-RU')}₽
                </span>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors font-bold"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold disabled:opacity-50"
              >
                {submitting ? 'Создание...' : 'Забронировать'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewBookingPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-premium-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewBookingForm />
    </Suspense>
  );
}
