'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays, Users, CreditCard, X, RefreshCw,
  LogIn, PackageOpen, AlertCircle, CheckCircle, Clock,
  XCircle, RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type BookingStatus =
  | 'pending' | 'confirmed' | 'completed'
  | 'cancelled' | 'cancelled_by_tourist' | 'cancelled_by_operator' | 'refunded';

interface MyBooking {
  id: string;
  date: string;
  participants: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: string;
  specialRequests: string | null;
  createdAt: string;
  tour: { id: string; name: string; difficulty: string | null; duration: string | null };
  operator: { name: string | null };
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pending:                { label: 'Ожидает подтверждения', color: 'text-[var(--warning)] bg-[var(--warning)]/10',    Icon: Clock     },
  confirmed:              { label: 'Подтверждено',          color: 'text-[var(--success)] bg-[var(--success)]/10',    Icon: CheckCircle },
  completed:              { label: 'Завершено',              color: 'text-[var(--text-muted)] bg-[var(--bg-hover)]',   Icon: CheckCircle },
  cancelled:              { label: 'Отменено',               color: 'text-[var(--danger)] bg-[var(--danger)]/10',     Icon: XCircle   },
  cancelled_by_tourist:   { label: 'Отменено вами',         color: 'text-[var(--danger)] bg-[var(--danger)]/10',     Icon: XCircle   },
  cancelled_by_operator:  { label: 'Отменено оператором',   color: 'text-[var(--danger)] bg-[var(--danger)]/10',     Icon: XCircle   },
  refunded:               { label: 'Возврат выполнен',      color: 'text-[var(--ocean)] bg-[var(--ocean)]/10',       Icon: RotateCcw },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid:   { label: 'Не оплачено', color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  pending:  { label: 'Ожидает оплаты', color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  paid:     { label: 'Оплачено',    color: 'text-[var(--success)] bg-[var(--success)]/10' },
  refunded: { label: 'Возврат',     color: 'text-[var(--ocean)] bg-[var(--ocean)]/10' },
};

const CANCELLABLE: Set<BookingStatus> = new Set(['pending', 'confirmed']);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BookingsClient() {
  const { user, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<Record<string, string>>({});

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings/my');
      const json = await res.json();
      if (json.success) {
        setBookings(json.data.bookings ?? []);
      } else {
        setError(json.error ?? 'Ошибка загрузки');
      }
    } catch {
      setError('Нет связи с сервером');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchBookings();
    else if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, fetchBookings]);

  async function handleCancel(bookingId: string) {
    if (!confirm('Отменить бронирование? Это действие необратимо.')) return;
    setCancellingId(bookingId);
    setCancelError(prev => ({ ...prev, [bookingId]: '' }));
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchBookings();
      } else {
        setCancelError(prev => ({ ...prev, [bookingId]: json.error ?? 'Ошибка отмены' }));
      }
    } catch {
      setCancelError(prev => ({ ...prev, [bookingId]: 'Нет связи с сервером' }));
    } finally {
      setCancellingId(null);
    }
  }

  // Not logged in
  if (!authLoading && !user) {
    return (
      <main className="ds-page pt-20 pb-16 min-h-screen">
        <div className="max-w-lg mx-auto text-center py-16">
          <LogIn className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h1 className="ds-h1 mb-2">Мои бронирования</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Войдите, чтобы просматривать свои туры и бронирования.
          </p>
          <Link href="/auth/login?next=/bookings" className="ds-btn ds-btn-primary inline-flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            Войти в аккаунт
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="ds-page pt-20 pb-16 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="ds-h1">Мои бронирования</h1>
            {!loading && bookings.length > 0 && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {bookings.length} {bookings.length === 1 ? 'бронирование' : bookings.length < 5 ? 'бронирования' : 'бронирований'}
              </p>
            )}
          </div>
          {!loading && (
            <button
              type="button"
              onClick={fetchBookings}
              className="ds-btn ds-btn-secondary flex items-center gap-1.5 text-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Обновить
            </button>
          )}
        </div>

        {/* Skeleton */}
        {(loading || authLoading) && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="ds-skeleton rounded-lg h-36" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && bookings.length === 0 && (
          <div className="text-center py-16">
            <PackageOpen className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
            <p className="text-[var(--text-secondary)] mb-4">У вас пока нет бронирований.</p>
            <Link href="/routes" className="ds-btn ds-btn-primary inline-flex items-center gap-2">
              Найти маршрут
            </Link>
          </div>
        )}

        {/* Bookings list */}
        {!loading && !error && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map(b => {
              const statusCfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.Icon;
              const paymentCfg = PAYMENT_CONFIG[b.paymentStatus] ?? PAYMENT_CONFIG.unpaid;
              const cancellable = CANCELLABLE.has(b.status);

              return (
                <div key={b.id} className="ds-card p-4 space-y-3">
                  {/* Top row: tour name + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                        {b.tour.name}
                      </p>
                      {b.operator.name && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{b.operator.name}</p>
                      )}
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${statusCfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {formatDate(b.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {b.participants} чел.
                    </span>
                    {b.totalPrice > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-[var(--accent)]">
                        <CreditCard className="w-3 h-3" />
                        {b.totalPrice.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-xs ${paymentCfg.color}`}>
                      {paymentCfg.label}
                    </span>
                  </div>

                  {/* Special requests */}
                  {b.specialRequests && (
                    <p className="text-xs text-[var(--text-muted)] italic line-clamp-2">
                      {b.specialRequests}
                    </p>
                  )}

                  {/* Cancel error */}
                  {cancelError[b.id] && (
                    <p className="text-xs text-[var(--danger)]">{cancelError[b.id]}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-[var(--text-muted)]">
                      #{b.id.substring(0, 8).toUpperCase()} · {formatDate(b.createdAt)}
                    </p>
                    {cancellable && (
                      <button
                        type="button"
                        onClick={() => handleCancel(b.id)}
                        disabled={cancellingId === b.id}
                        className="flex items-center gap-1 text-xs text-[var(--danger)] hover:underline disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        {cancellingId === b.id ? 'Отменяем…' : 'Отменить'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
