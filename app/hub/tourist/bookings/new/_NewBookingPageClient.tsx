'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TouristNav } from '@/components/tourist/TouristNav';

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const tourId = searchParams.get('tourId');

  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    participants: 1,
    specialRequests: ''
  });

  useEffect(() => {
    if (tourId) {
      fetchTour();
    }
  }, [tourId]);

  const fetchTour = async () => {
    try {
      const response = await fetch(`/api/tours/${tourId}`);
      const data = await response.json();
      if (data.success) {
        setTour(data.data);
      }
    } catch (error) {
      console.error('Error fetching tour:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('Необходимо войти в систему');
      router.push('/auth/login');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          tourId,
          date: formData.date,
          participants: formData.participants,
          specialRequests: formData.specialRequests
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Бронирование создано успешно!');
        router.push('/hub/tourist/bookings');
      } else {
        alert(result.error || 'Ошибка при создании бронирования');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Ошибка при создании бронирования');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-premium-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-premium-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-premium-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Тур не найден</h2>
          <button
            onClick={() => router.push('/hub/tourist')}
            className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold"
          >
            Вернуться к турам
          </button>
        </div>
      </div>
    );
  }

  const totalPrice = tour.price * formData.participants;

  return (
    <div className="min-h-screen bg-premium-black">
      <TouristNav />
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
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{tour.name}</h2>
              <p className="text-white/70 mb-4">{tour.description}</p>
              <div className="flex items-center space-x-4 text-sm text-white/70">
                <span>Длительность: {tour.duration}</span>
                <span>•</span>
                <span>Сложность: {tour.difficulty}</span>
                <span>•</span>
                <span className="text-premium-gold font-bold">{tour.price.toLocaleString()}₽ / чел.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="space-y-6">
            {/* Date */}
            <div>
              <label htmlFor="booking-date" className="block text-sm font-medium text-white mb-2">Дата тура *</label>
              <input
                id="booking-date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>

            {/* Participants */}
            <div>
              <label htmlFor="booking-participants" className="block text-sm font-medium text-white mb-2">Количество участников *</label>
              <input
                id="booking-participants"
                required
                min={tour.min_group_size || 1}
                max={tour.max_group_size || 20}
                value={formData.participants}
                onChange={(e) => setFormData({ ...formData, participants: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
              <p className="text-white/50 text-sm mt-1">
                Минимум: {tour.min_group_size || 1}, Максимум: {tour.max_group_size || 20}
              </p>
            </div>

            {/* Special Requests */}
            <div>
              <label htmlFor="booking-requests" className="block text-sm font-medium text-white mb-2">Особые пожелания</label>
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
                <span className="text-white text-lg">Общая стоимость:</span>
                <span className="text-premium-gold text-2xl font-bold">{totalPrice.toLocaleString()}₽</span>
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
      <div className="min-h-screen bg-premium-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-premium-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <NewBookingForm />
    </Suspense>
  );
}
