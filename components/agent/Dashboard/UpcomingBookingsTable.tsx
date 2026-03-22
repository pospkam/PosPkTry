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
    if (days <= 1) return 'text-[var(--danger)]';
    if (days <= 7) return 'text-[var(--warning)]';
    return 'text-[var(--success)]';
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
      <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-4 text-center">
        <p className="text-[var(--danger)] mb-2">Ошибка загрузки бронирований</p>
        <button
          onClick={fetchBookings}
          className="px-3 py-1 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded text-sm transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[var(--text-muted)] mb-4">Нет предстоящих бронирований</p>
        <button
          onClick={() => window.location.href = '/hub/agent/bookings'}
          className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-[var(--bg-card)] font-bold rounded-lg transition-colors"
        >
          Создать бронирование
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Предстоящие бронирования</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--bg-card)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Тур
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Клиент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Дата
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Доход
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Комиссия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {bookings.map((booking) => {
              const daysUntil = getDaysUntilTour(booking.tourDate);
              return (
                <tr key={booking.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{booking.tourName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--text-primary)]">{booking.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--text-primary)]">
                      {new Date(booking.tourDate).toLocaleDateString('ru-RU')}
                    </div>
                    <div className={`text-xs ${getUrgencyColor(daysUntil)}`}>
                      через {daysUntil} дн.
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--accent)] font-medium">
                    {booking.totalPrice.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--success)] font-medium">
                    {booking.commission.toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-card)]">
        <button
          onClick={() => window.location.href = '/hub/agent/bookings'}
          className="text-[var(--accent)] hover:text-[var(--accent)]/80 text-sm font-medium transition-colors"
        >
          Посмотреть все бронирования →
        </button>
      </div>
    </div>
  );
}

