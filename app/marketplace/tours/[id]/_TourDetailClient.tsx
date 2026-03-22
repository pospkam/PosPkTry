'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, MapPinIcon, Clock, Users } from 'lucide-react';
import BookingFormClient from '@/components/marketplace/BookingFormClient';

interface TourDetail {
  id: number;
  title: string;
  description: string;
  base_price: number;
  activity_type: string;
  location_type: string;
  location: string;
  tour_image: string | null;
  operator_name: string;
  operator_id: number;
  bookings_count: number;
}

export default function TourDetailClient() {
  const params = useParams();
  const tourId = parseInt(params.id as string);

  const [tour, setTour] = useState<TourDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTour = async () => {
      try {
        const res = await fetch(`/api/hub/marketplace/tours?limit=1&offset=0`);
        if (res.ok) {
          const data = await res.json();
          const found = data.tours.find((t: TourDetail) => t.id === tourId);
          if (found) {
            setTour(found);
          } else {
            setError('Тур не найден');
          }
        }
      } catch (err) {
        setError('Ошибка загрузки тура');
      } finally {
        setLoading(false);
      }
    };

    fetchTour();
  }, [tourId]);

  const activityLabels: Record<string, string> = {
    trekking: 'Треккинг',
    fishing: 'Рыбалка',
    thermal: 'Термальные источники',
    helicopter: 'Вертолётные туры',
    boat_trip: 'Круизы',
    bears: 'Наблюдение за медведями'
  };

  const locationLabels: Record<string, string> = {
    mountain: 'Горы',
    volcano: 'Вулканы',
    hot_spring: 'Горячие источники',
    lake: 'Озера',
    sea: 'Море',
    river: 'Реки'
  };

  if (loading) {
    return (
      <div className="ds-page text-center py-24">
        <div className="ds-skeleton h-12 w-48 mx-auto mb-4" />
        <div className="ds-skeleton h-32 w-full mb-4" />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="ds-page text-center py-24">
        <p className="text-[var(--text-muted)] mb-4">{error || 'Тур не найден'}</p>
        <a href="/marketplace" className="text-[var(--ocean)] hover:underline">
          ← Вернуться в каталог
        </a>
      </div>
    );
  }

  return (
    <div className="ds-page pb-20">
      {/* Header */}
      <div className="mb-8">
        <a href="/marketplace" className="text-[var(--ocean)] hover:underline text-sm mb-4 inline-block">
          ← Назад в каталог
        </a>

        <h1 className="ds-h1 mb-4">{tour.title}</h1>

        <p className="text-[var(--text-secondary)] mb-6">
          Оператор: <span className="font-semibold text-[var(--text-primary)]">{tour.operator_name}</span>
        </p>
      </div>

      {/* Hero Image */}
      {tour.tour_image && (
        <div className="w-full h-96 rounded-lg overflow-hidden mb-8 shadow-lg">
          <img
            src={tour.tour_image}
            alt={tour.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="ds-card p-6 mb-6">
            <h2 className="ds-h2 mb-4">Описание</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {tour.description}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="ds-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <MapPinIcon size={20} className="text-[var(--ocean)]" />
                <span className="text-xs text-[var(--text-muted)]">Тип места</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {locationLabels[tour.location_type] || tour.location_type}
              </p>
            </div>

            <div className="ds-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <MapPin size={20} className="text-[var(--ocean)]" />
                <span className="text-xs text-[var(--text-muted)]">Активность</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {activityLabels[tour.activity_type] || tour.activity_type}
              </p>
            </div>

            <div className="ds-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <Users size={20} className="text-[var(--ocean)]" />
                <span className="text-xs text-[var(--text-muted)]">Бронирований</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {tour.bookings_count}
              </p>
            </div>

            <div className="ds-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-[var(--ocean)]" />
                <span className="text-xs text-[var(--text-muted)]">Локация</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {tour.location || 'Камчатка'}
              </p>
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div>
          <div className="ds-card p-6 mb-4 sticky top-4">
            <div className="mb-6">
              <p className="text-xs text-[var(--text-muted)] mb-1">Стартовая цена</p>
              <div className="text-3xl font-bold text-[var(--accent)]">
                {tour.base_price.toLocaleString('ru-RU')}₽
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">на одного участника</p>
            </div>

            <div className="bg-[var(--bg-hover)] rounded-lg p-4 mb-4 text-sm text-[var(--text-secondary)]">
              <p>Финальная цена рассчитывается в зависимости от количества участников.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <div className="mb-12">
        <BookingFormClient tourId={tour.id} />
      </div>

      {/* Info Box */}
      <div className="bg-[var(--bg-hover)] rounded-lg p-6 text-sm">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">Важная информация</h3>
        <ul className="space-y-2 text-[var(--text-secondary)]">
          <li>✓ Оператор свяжется с вами в течение час после бронирования</li>
          <li>✓ Все туры включены в страховку безопасности</li>
          <li>✓ Возврат средств возможен за 48 часов до даты тура</li>
          <li>✓ Минимальное количество участников: 1 человек</li>
        </ul>
      </div>
    </div>
  );
}
