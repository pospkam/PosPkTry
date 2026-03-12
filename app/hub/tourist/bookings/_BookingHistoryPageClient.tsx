'use client';

import { useState } from 'react';
import { LoadingSpinner } from '@/components/admin/shared';
import { Booking } from '@/types';
import { Calendar, Users } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

export default function BookingHistoryPageClient() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');

  const { data: bookings, loading } = useApiFetch<Booking[], Booking[]>(
    '/api/bookings',
    (d) => d ?? [],
  );

  const list = bookings ?? [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-[var(--warning)]/15 text-[var(--warning)]',
      confirmed: 'bg-[var(--success)]/15 text-[var(--success)]',
      completed: 'bg-[var(--accent)]/15 text-[var(--accent)]',
      cancelled: 'bg-[var(--danger)]/15 text-[var(--danger)]',
    };
    const labels: Record<string, string> = {
      pending: 'Ожидает',
      confirmed: 'Подтверждено',
      completed: 'Завершено',
      cancelled: 'Отменено',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] ?? ''}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-[var(--warning)]/15 text-[var(--warning)]',
      paid: 'bg-[var(--success)]/15 text-[var(--success)]',
      refunded: 'bg-[var(--bg-hover)] text-[var(--text-muted)]',
    };
    const labels: Record<string, string> = {
      pending: 'Не оплачено',
      paid: 'Оплачено',
      refunded: 'Возврат',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] ?? ''}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  const filteredBookings = list.filter((booking) => {
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
      <div className="p-5 lg:p-6 flex items-center justify-center py-20">
        <LoadingSpinner message="Загрузка бронирований..." />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Мои бронирования</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-0.5">
          История ваших бронирований и заказов
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'upcoming', 'past', 'cancelled'] as const).map((f) => {
          const labels = {
            all: `Все (${list.length})`,
            upcoming: 'Предстоящие',
            past: 'Прошедшие',
            cancelled: 'Отменённые',
          };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                  : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <p className="text-[var(--text-secondary)] text-base">У вас пока нет бронирований</p>
          <button
            onClick={() => {
              window.location.href = '/hub/tourist';
            }}
            className="mt-5 px-6 py-2.5 bg-[var(--accent)] text-[var(--bg-card)] rounded-md text-sm font-semibold transition-colors"
          >
            Начать путешествие
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
                    {booking.tour?.title || 'Тур'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(booking.date).toLocaleDateString('ru-RU')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {booking.participants} чел
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {booking.totalPrice.toLocaleString('ru-RU')} ₽
                  </p>
                  <div className="flex flex-col gap-1.5 items-end">
                    {getStatusBadge(booking.status)}
                    {getPaymentBadge(booking.paymentStatus)}
                  </div>
                </div>
              </div>

              {booking.specialRequests && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Особые пожелания:</p>
                  <p className="text-sm text-[var(--text-secondary)]">{booking.specialRequests}</p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2">
                <button className="px-4 py-1.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-md text-sm transition-colors hover:bg-[var(--bg-hover)]">
                  Подробнее
                </button>
                {booking.status === 'pending' && (
                  <button className="px-4 py-1.5 border border-[var(--danger)]/40 text-[var(--danger)] rounded-md text-sm transition-colors hover:bg-[var(--danger)]/10">
                    Отменить
                  </button>
                )}
                {booking.status === 'completed' && booking.paymentStatus === 'paid' && (
                  <button className="px-4 py-1.5 border border-[var(--accent)]/40 text-[var(--accent)] rounded-md text-sm transition-colors hover:bg-[var(--accent)]/10">
                    Оставить отзыв
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
