'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const INPUT =
  'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

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
        const tourRes = await fetch(`/api/tours/${tourId}`);
        const tourData = await tourRes.json();
        if (tourData.success) {
          setTour(tourData.data as TourInfo);
        }

        if (departureId) {
          const depRes = await fetch(`/api/tours/${tourId}/departures/${departureId}`);
          const depData = await depRes.json();
          if (depData.success && depData.data) {
            const dep = depData.data as DepartureInfo;
            setDeparture(dep);
            setFormData((prev) => ({
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
          Authorization: `Bearer ${user.token}`,
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
      <div className="p-5 lg:p-6 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!tourId || !tour) {
    return (
      <div className="p-5 lg:p-6 flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Тур не найден</h2>
          <button
            onClick={() => router.push('/tours')}
            className="px-5 py-2.5 bg-[var(--accent)] text-[var(--bg-card)] rounded-md text-sm font-semibold transition-colors"
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
  const minParticipants = departure ? departure.minGroupSize : tour.minGroupSize || 1;

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Back + title */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-3 flex items-center gap-1.5 text-sm transition-colors"
        >
          <span>←</span>
          <span>Назад</span>
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Новое бронирование</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-0.5">
          Заполните форму для бронирования тура
        </p>
      </div>

      {/* Tour Info */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <div className="flex items-start gap-4">
          {tour.images && tour.images.length > 0 && (
            <div className="w-24 h-24 rounded-md relative overflow-hidden flex-shrink-0">
              <Image
                src={tour.images[0]}
                alt={tour.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">{tour.name}</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-2">
              {tour.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
              <span>Длительность: {tour.duration} ч.</span>
              <span>•</span>
              <span>Сложность: {tour.difficulty}</span>
              <span>•</span>
              <span className="text-[var(--accent)] font-semibold">
                {pricePerPerson.toLocaleString('ru-RU')}₽ / чел.
              </span>
            </div>

            {departure && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-md text-sm text-[var(--success)]">
                <span>
                  Заезд:{' '}
                  {new Date(departure.startDate).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {departure.endDate && (
                    <>
                      {' '}
                      —{' '}
                      {new Date(departure.endDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </>
                  )}
                </span>
                <span className="text-[var(--text-muted)]">&bull;</span>
                <span>Свободно: {departure.spotsLeft} мест</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-5"
      >
        {/* Date */}
        <div>
          <label htmlFor="booking-date" className={LABEL}>
            Дата тура {!departure && '*'}
          </label>
          {departure ? (
            <div className="w-full px-3.5 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] text-sm">
              {new Date(departure.startDate).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {departure.notes && (
                <span className="block text-[var(--text-muted)] text-xs mt-1 italic">
                  {departure.notes}
                </span>
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
              className={INPUT}
            />
          )}
        </div>

        {/* Participants */}
        <div>
          <label htmlFor="booking-participants" className={LABEL}>
            Количество участников *
          </label>
          <input
            id="booking-participants"
            type="number"
            required
            min={minParticipants}
            max={maxParticipants}
            value={formData.participants}
            onChange={(e) =>
              setFormData({ ...formData, participants: parseInt(e.target.value, 10) || 1 })
            }
            className={INPUT}
          />
          <p className="text-[var(--text-muted)] text-xs mt-1">
            Минимум: {minParticipants}, Максимум: {maxParticipants}
            {departure && ' (свободных мест)'}
          </p>
        </div>

        {/* Special Requests */}
        <div>
          <label htmlFor="booking-requests" className={LABEL}>
            Особые пожелания
          </label>
          <textarea
            id="booking-requests"
            rows={4}
            value={formData.specialRequests}
            onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
            placeholder="Укажите любые особые пожелания или требования..."
            className={`${INPUT} resize-none`}
          />
        </div>

        {/* Total Price */}
        <div className="bg-[var(--accent)]/10 rounded-md p-4 border border-[var(--accent)]/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-primary)] text-sm font-medium">
                Общая стоимость:
              </span>
              {formData.participants > 1 && (
                <p className="text-[var(--text-muted)] text-xs mt-0.5">
                  {pricePerPerson.toLocaleString('ru-RU')}₽ × {formData.participants} чел.
                </p>
              )}
            </div>
            <span className="text-[var(--accent)] text-xl font-bold">
              {totalPrice.toLocaleString('ru-RU')}₽
            </span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-5 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-md text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-5 py-2.5 bg-[var(--accent)] text-[var(--bg-card)] rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Создание...' : 'Забронировать'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewBookingPageClient() {
  return (
    <Suspense
      fallback={
        <div className="p-5 lg:p-6 flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NewBookingForm />
    </Suspense>
  );
}
