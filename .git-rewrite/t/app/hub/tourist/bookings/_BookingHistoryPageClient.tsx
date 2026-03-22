'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/admin/shared';
import { Calendar, Users, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';
import type { BookingWithDetails, BookingStatus } from '@/types/booking.types';

type BookingsApiPayload = {
  bookings: BookingWithDetails[];
  total: number;
  limit: number;
  offset: number;
};

export default function BookingHistoryPageClient() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Bug 1 fix: correct generic types and transform to extract the bookings array
  // from the API envelope { data: { bookings: [...], total, limit, offset } }
  const { data: bookings, loading, refetch } = useApiFetch<BookingsApiPayload, BookingWithDetails[]>(
    '/api/bookings',
    (d) => d?.bookings ?? [],
  );

  const list = bookings ?? [];

  const isCancellableStatus = (status: BookingStatus) =>
    status === 'pending' || status === 'confirmed';

  const isCancelledStatus = (status: BookingStatus) =>
    status === 'cancelled' ||
    status === 'cancelled_by_tourist' ||
    status === 'cancelled_by_operator';

  // Bug 2 fix: wire up the cancel API call with confirmation + refetch
  const handleCancel = useCallback(
    async (bookingId: string) => {
      if (
        !window.confirm(
          'Вы уверены, что хотите отменить бронирование? Это действие нельзя отменить.',
        )
      ) {
        return;
      }
      setCancellingId(bookingId);
      try {
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
        const json = (await res.json()) as { success: boolean; error?: string; message?: string };
        if (!json.success) {
          alert(json.error ?? 'Не удалось отменить бронирование');
          return;
        }
        await refetch();
      } catch {
        alert('Ошибка при отмене бронирования');
      } finally {
        setCancellingId(null);
      }
    },
    [refetch],
  );

  const getStatusBadge = (status: BookingStatus) => {
    const statusMap: Record<BookingStatus, { style: string; label: string }> = {
      pending: {
        style: 'bg-[var(--warning)]/15 text-[var(--warning)]',
        label: 'Ожидает',
      },
      confirmed: {
        style: 'bg-[var(--success)]/15 text-[var(--success)]',
        label: 'Подтверждено',
      },
      completed: {
        style: 'bg-[var(--accent)]/15 text-[var(--accent)]',
        label: 'Завершено',
      },
      cancelled: {
        style: 'bg-[var(--danger)]/15 text-[var(--danger)]',
        label: 'Отменено',
      },
      cancelled_by_tourist: {
        style: 'bg-[var(--danger)]/15 text-[var(--danger)]',
        label: 'Отменено вами',
      },
      cancelled_by_operator: {
        style: 'bg-[var(--danger)]/15 text-[var(--danger)]',
        label: 'Отменено оператором',
      },
      refunded: {
        style: 'bg-[var(--bg-hover)] text-[var(--text-muted)]',
        label: 'Возврат',
      },
    };
    const { style, label } = statusMap[status] ?? { style: '', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>{label}</span>
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
        return bookingDate >= today && !isCancelledStatus(booking.status);
      case 'past':
        return bookingDate < today || booking.status === 'completed';
      case 'cancelled':
        return isCancelledStatus(booking.status);
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
          <Link
            href="/hub/tourist"
            className="mt-5 inline-block px-6 py-2.5 bg-[var(--accent)] text-[var(--bg-card)] rounded-md text-sm font-semibold transition-colors"
          >
            Начать путешествие
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const isExpanded = expandedId === booking.id;
            const isCancelling = cancellingId === booking.id;

            return (
              <div
                key={booking.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
                        {booking.tour.title}
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
                      {/* Bug 1 fix: use totalAmount (BookingWithDetails field) not totalPrice */}
                      <p className="text-xl font-bold text-[var(--text-primary)] mb-2">
                        {Number(booking.totalAmount).toLocaleString('ru-RU')} ₽
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
                      <p className="text-sm text-[var(--text-secondary)]">
                        {booking.specialRequests}
                      </p>
                    </div>
                  )}

                  {/* Action buttons — Bug 2 fix: all buttons now functional */}
                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2 flex-wrap">
                    {/* "Подробнее" — inline expand since no detail page exists */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                      className="flex items-center gap-1 px-4 py-1.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-md text-sm transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      {isExpanded ? (
                        <>
                          Свернуть
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Подробнее
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    {/* "Отменить" — shown for pending OR confirmed, calls cancel API */}
                    {isCancellableStatus(booking.status) && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={isCancelling}
                        className="px-4 py-1.5 border border-[var(--danger)]/40 text-[var(--danger)] rounded-md text-sm transition-colors hover:bg-[var(--danger)]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCancelling ? 'Отмена...' : 'Отменить'}
                      </button>
                    )}

                    {/* "Оставить отзыв" — shown only for completed bookings, links to reviews page */}
                    {booking.status === 'completed' && (
                      <Link
                        href={`/hub/tourist/reviews?bookingId=${booking.id}&tourId=${booking.tour.id}`}
                        className="flex items-center gap-1 px-4 py-1.5 border border-[var(--accent)]/40 text-[var(--accent)] rounded-md text-sm transition-colors hover:bg-[var(--accent)]/10"
                      >
                        <Star className="w-3.5 h-3.5" />
                        Оставить отзыв
                      </Link>
                    )}
                  </div>
                </div>

                {/* Inline detail expansion panel */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-hover)] px-5 py-4 space-y-3">
                    <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                      Детали бронирования
                    </h4>
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <dt className="text-[var(--text-muted)] text-xs mb-0.5">Номер заказа</dt>
                        <dd className="text-[var(--text-primary)] font-mono text-xs">
                          {booking.id.slice(0, 8).toUpperCase()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)] text-xs mb-0.5">Дата бронирования</dt>
                        <dd className="text-[var(--text-secondary)]">
                          {new Date(booking.createdAt).toLocaleDateString('ru-RU')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)] text-xs mb-0.5">Стоимость тура</dt>
                        <dd className="text-[var(--text-secondary)]">
                          {Number(booking.tour.price).toLocaleString('ru-RU')} ₽ / чел
                        </dd>
                      </div>
                      {booking.refundAmount !== null && booking.refundAmount > 0 && (
                        <div>
                          <dt className="text-[var(--text-muted)] text-xs mb-0.5">Сумма возврата</dt>
                          <dd className="text-[var(--success)] font-semibold">
                            {Number(booking.refundAmount).toLocaleString('ru-RU')} ₽
                          </dd>
                        </div>
                      )}
                      {booking.cancelledAt && (
                        <div>
                          <dt className="text-[var(--text-muted)] text-xs mb-0.5">Дата отмены</dt>
                          <dd className="text-[var(--danger)]">
                            {new Date(booking.cancelledAt).toLocaleDateString('ru-RU')}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {booking.logs.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                          История статусов
                        </p>
                        <ul className="space-y-1.5">
                          {booking.logs.map((log) => (
                            <li key={log.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                              <span>
                                {new Date(log.createdAt).toLocaleDateString('ru-RU')}
                                {' — '}
                                {log.comment ?? `${log.fromStatus} → ${log.toStatus}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
