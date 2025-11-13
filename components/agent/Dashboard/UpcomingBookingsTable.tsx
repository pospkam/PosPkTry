'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { StatusBadge } from '../../admin/shared/StatusBadge';

interface UpcomingBooking {
  id: string;
  clientName: string;
  tourName: string;
  tourDate: Date;
  totalPrice: number;
  commission: number;
}

interface UpcomingBookingsTableProps {
  limit?: number;
}

export function UpcomingBookingsTable({ limit = 5 }: UpcomingBookingsTableProps) {
  const [bookings, setBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [limit]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/dashboard');
      const result = await response.json();

      if (result.success) {
        setBookings(result.data.upcomingBookings.slice(0, limit));
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error fetching upcoming bookings:', err);
      setError('Ошибка загрузки бронирований');
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilTour = (tourDate: Date) => {
    const today = new Date();
    const tour = new Date(tourDate);
    const diffTime = tour.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'text-red-400';
    if (days <= 7) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoadingSpinner message="Загрузка предстоящих туров..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
        <p className="text-red-400 mb-2">Ошибка загрузки бронирований</p>
        <button
          onClick={fetchBookings}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white/60 mb-4">Нет предстоящих бронирований</p>
        <button
          onClick={() => window.location.href = '/hub/agent/bookings'}
          className="px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-lg transition-colors"
        >
          Создать бронирование
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Предстоящие бронирования</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Тур
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Клиент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Дата
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Доход
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Комиссия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {bookings.map((booking) => {
              const daysUntil = getDaysUntilTour(booking.tourDate);
              return (
                <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{booking.tourName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{booking.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {new Date(booking.tourDate).toLocaleDateString('ru-RU')}
                    </div>
                    <div className={`text-xs ${getUrgencyColor(daysUntil)}`}>
                      через {daysUntil} дн.
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-premium-gold font-medium">
                    {booking.totalPrice.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-medium">
                    {booking.commission.toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-white/10 bg-white/5">
        <button
          onClick={() => window.location.href = '/hub/agent/bookings'}
          className="text-premium-gold hover:text-premium-gold/80 text-sm font-medium transition-colors"
        >
          Посмотреть все бронирования →
        </button>
      </div>
    </div>
  );
}

