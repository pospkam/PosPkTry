'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { LoadingSpinner } from '@/components/admin/shared';
import { TouristNav } from '@/components/tourist/TouristNav';
import { Booking } from '@/types';

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings');
      const result = await response.json();

      if (result.success) {
        setBookings(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      confirmed: 'bg-green-500/20 text-green-400',
      completed: 'bg-blue-500/20 text-blue-400',
      cancelled: 'bg-red-500/20 text-red-400'
    };
    
    const labels = {
      pending: 'Ожидает',
      confirmed: 'Подтверждено',
      completed: 'Завершено',
      cancelled: 'Отменено'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      paid: 'bg-green-500/20 text-green-400',
      refunded: 'bg-gray-500/20 text-gray-400'
    };
    
    const labels = {
      pending: 'Не оплачено',
      paid: 'Оплачено',
      refunded: 'Возврат'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    
    const today = new Date();
    const bookingDate = new Date(booking.date);
    
    switch (filter) {
      case 'upcoming':
        return bookingDate >= today && booking.status !== 'cancelled';
      case 'past':
        return bookingDate < today || booking.status === 'completed';
      case 'cancelled':
        return booking.status === 'cancelled';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <Protected roles={['tourist']}>
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <LoadingSpinner message="Загрузка бронирований..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['tourist']}>
      <main className="min-h-screen bg-transparent text-white">
        <TouristNav />
        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <h1 className="text-3xl font-black text-white">Мои бронирования</h1>
          <p className="text-white/70">История ваших бронирований и заказов</p>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-premium-gold text-premium-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Все ({bookings.length})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
                filter === 'upcoming'
                  ? 'bg-premium-gold text-premium-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Предстоящие
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
                filter === 'past'
                  ? 'bg-premium-gold text-premium-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Прошедшие
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
                filter === 'cancelled'
                  ? 'bg-premium-gold text-premium-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Отменённые
            </button>
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className="bg-white/15 border border-white/15 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-white/70 text-lg">У вас пока нет бронирований</p>
              <button
                onClick={() => window.location.href = '/hub/tourist'}
                className="mt-6 px-8 py-3 bg-premium-gold text-premium-black rounded-xl font-semibold hover:bg-premium-gold/80 transition-colors"
              >
                Начать путешествие
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white/15 border border-white/15 rounded-2xl p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{booking.tour?.title || 'Тур'}</h3>
                      <div className="flex items-center gap-4 text-sm text-white/70">
                        <span>📅 {new Date(booking.date).toLocaleDateString('ru-RU')}</span>
                        <span>👥 {booking.participants} чел</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white mb-2">
                        {booking.totalPrice.toLocaleString('ru-RU')} ₽
                      </p>
                      <div className="flex flex-col gap-2">
                        {getStatusBadge(booking.status)}
                        {getPaymentBadge(booking.paymentStatus)}
                      </div>
                    </div>
                  </div>

                  {booking.specialRequests && (
                    <div className="mt-4 pt-4 border-t border-white/15">
                      <p className="text-xs text-white/50 mb-1">Особые пожелания:</p>
                      <p className="text-sm text-white/80">{booking.specialRequests}</p>
                    </div>
                  )}

                  {/* Действия */}
                  <div className="mt-4 pt-4 border-t border-white/15 flex gap-3">
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                      Подробнее
                    </button>
                    {booking.status === 'pending' && (
                      <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors">
                        Отменить
                      </button>
                    )}
                    {booking.status === 'completed' && booking.paymentStatus === 'paid' && (
                      <button className="px-4 py-2 bg-premium-gold/20 hover:bg-premium-gold/30 text-white rounded-lg text-sm transition-colors">
                        Оставить отзыв
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}

