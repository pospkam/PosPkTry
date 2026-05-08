'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  ArrowLeft, CheckCircle, XCircle, Award, UserX,
  Phone, Mail, Calendar, Users, Wallet, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface BookingDetail {
  id: string;
  operator_tour_id: string;
  tour_title: string;
  location_name: string | null;
  tour_base_price: string | null;
  tourist_name: string | null;
  tourist_email: string | null;
  tourist_phone: string | null;
  booking_date: string;
  participants: number;
  base_total_price: string | null;
  final_price: string | null;
  currency: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  booking_status: 'new' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  special_requests: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  weather_alert_triggered: boolean;
  created_via: string | null;
  created_at: string;
  updated_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const RUB = (v: string | number | null | undefined) =>
  v == null ? '—' : Number(v).toLocaleString('ru-RU') + ' ₽';

const STATUS_LABEL: Record<string, string> = {
  new: 'Новая', confirmed: 'Подтверждена',
  cancelled: 'Отменена', completed: 'Завершена', no_show: 'Не явился',
};
const STATUS_STYLE: Record<string, string> = {
  new:       'bg-[var(--warning)]/10  text-[var(--warning)]',
  confirmed: 'bg-[var(--success)]/10 text-[var(--success)]',
  cancelled: 'bg-[var(--danger)]/10  text-[var(--danger)]',
  completed: 'bg-[var(--ocean)]/10   text-[var(--ocean)]',
  no_show:   'bg-[var(--bg-hover)] text-[var(--text-muted)]',
};
const PAY_LABEL: Record<string, string> = {
  pending: 'Ожидает оплаты', paid: 'Оплачено', failed: 'Ошибка оплаты', refunded: 'Возврат',
};
const PAY_STYLE: Record<string, string> = {
  pending: 'text-[var(--warning)]',
  paid: 'text-[var(--success)]',
  failed: 'text-[var(--danger)]',
  refunded: 'text-[var(--text-muted)]',
};

interface Props { bookingId: string }

export default function BookingDetailClient({ bookingId }: Props) {
  const { data, error, mutate } = useSWR<{ success: boolean; data: BookingDetail }>(
    `/api/hub/operator/bookings/${bookingId}`,
    fetcher,
  );

  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const booking = data?.data;

  async function updateStatus(booking_status: string, cancellation_reason?: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/hub/operator/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_status, cancellation_reason }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка');
      setNotification({ type: 'success', text: `Статус изменён: ${STATUS_LABEL[booking_status]}` });
      await mutate();
    } catch (e) {
      setNotification({ type: 'error', text: e instanceof Error ? e.message : 'Ошибка обновления' });
    } finally {
      setUpdating(false);
      setTimeout(() => setNotification(null), 4000);
    }
  }

  if (error) return (
    <div className="ds-page">
      <Link href="/hub/operator/bookings" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Назад к бронированиям
      </Link>
      <div className="ds-card p-6 text-[var(--danger)]">Не удалось загрузить бронирование</div>
    </div>
  );

  if (!booking) return (
    <div className="ds-page">
      <Link href="/hub/operator/bookings" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Назад к бронированиям
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="ds-card p-6 animate-pulse h-32" />
        ))}
      </div>
    </div>
  );

  const canConfirm = booking.booking_status === 'new';
  const canComplete = booking.booking_status === 'confirmed';
  const canCancel = booking.booking_status === 'new' || booking.booking_status === 'confirmed';
  const canMarkNoShow = booking.booking_status === 'confirmed';

  return (
    <div className="ds-page">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
          notification.type === 'success'
            ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20'
            : 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20'
        }`}>
          {notification.text}
        </div>
      )}

      <Link href="/hub/operator/bookings" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Все бронирования
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[var(--text-muted)] text-xs mb-1">Бронь #{booking.id}</p>
          <h1 className="ds-h2">{booking.tour_title}</h1>
          {booking.location_name && (
            <p className="text-[var(--text-secondary)] text-sm mt-1">{booking.location_name}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[booking.booking_status]}`}>
            {STATUS_LABEL[booking.booking_status]}
          </span>
          <span className={`text-xs font-medium ${PAY_STYLE[booking.payment_status]}`}>
            {PAY_LABEL[booking.payment_status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Tourist */}
        <div className="ds-card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Турист</h2>
          <div className="space-y-3">
            <div>
              <p className="ds-label">Имя</p>
              <p className="text-[var(--text-primary)] font-medium">{booking.tourist_name ?? '—'}</p>
            </div>
            {booking.tourist_phone && (
              <div>
                <p className="ds-label">Телефон</p>
                <a href={`tel:${booking.tourist_phone}`} className="flex items-center gap-2 text-[var(--ocean)] hover:underline">
                  <Phone className="w-4 h-4" /> {booking.tourist_phone}
                </a>
              </div>
            )}
            {booking.tourist_email && (
              <div>
                <p className="ds-label">Email</p>
                <a href={`mailto:${booking.tourist_email}`} className="flex items-center gap-2 text-[var(--ocean)] hover:underline">
                  <Mail className="w-4 h-4" /> {booking.tourist_email}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Booking details */}
        <div className="ds-card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Детали</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
              <div>
                <p className="ds-label">Дата тура</p>
                <p className="text-[var(--text-primary)] font-medium">
                  {new Date(booking.booking_date + 'T00:00').toLocaleDateString('ru-RU', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--text-muted)]" />
              <div>
                <p className="ds-label">Участников</p>
                <p className="text-[var(--text-primary)] font-medium">{booking.participants} чел.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[var(--text-muted)]" />
              <div>
                <p className="ds-label">Итоговая сумма</p>
                <p className="text-[var(--text-primary)] font-medium text-lg">{RUB(booking.final_price ?? booking.base_total_price)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(booking.special_requests || booking.notes || booking.cancellation_reason || booking.weather_alert_triggered) && (
        <div className="ds-card p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Дополнительно</h2>
          <div className="space-y-3">
            {booking.weather_alert_triggered && (
              <div className="flex items-center gap-2 text-[var(--warning)] bg-[var(--warning)]/10 px-3 py-2 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Погодное предупреждение активно
              </div>
            )}
            {booking.special_requests && (
              <div>
                <p className="ds-label">Пожелания туриста</p>
                <p className="text-[var(--text-primary)] text-sm">{booking.special_requests}</p>
              </div>
            )}
            {booking.notes && (
              <div>
                <p className="ds-label">Заметки оператора</p>
                <p className="text-[var(--text-primary)] text-sm">{booking.notes}</p>
              </div>
            )}
            {booking.cancellation_reason && (
              <div>
                <p className="ds-label">Причина отмены</p>
                <p className="text-[var(--danger)] text-sm">{booking.cancellation_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {(canConfirm || canComplete || canCancel || canMarkNoShow) && (
        <div className="ds-card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Действия</h2>
          <div className="flex flex-wrap gap-3">
            {canConfirm && (
              <button
                onClick={() => updateStatus('confirmed')}
                disabled={updating}
                className="ds-btn ds-btn-primary flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Подтвердить
              </button>
            )}
            {canComplete && (
              <button
                onClick={() => updateStatus('completed')}
                disabled={updating}
                className="ds-btn ds-btn-secondary flex items-center gap-2"
              >
                <Award className="w-4 h-4" /> Завершить тур
              </button>
            )}
            {canMarkNoShow && (
              <button
                onClick={() => updateStatus('no_show')}
                disabled={updating}
                className="ds-btn ds-btn-secondary flex items-center gap-2"
              >
                <UserX className="w-4 h-4" /> Не явился
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => {
                  const reason = window.prompt('Причина отмены (необязательно):') ?? '';
                  updateStatus('cancelled', reason || undefined);
                }}
                disabled={updating}
                className="ds-btn ds-btn-danger flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Отменить
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-[var(--text-muted)]">
        Создано: {new Date(booking.created_at).toLocaleString('ru-RU')}
        {booking.created_via && ` · через ${booking.created_via}`}
        {' · '}Обновлено: {new Date(booking.updated_at).toLocaleString('ru-RU')}
      </div>
    </div>
  );
}
