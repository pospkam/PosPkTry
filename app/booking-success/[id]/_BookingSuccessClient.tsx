'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Copy, Home, Calendar, Users, Phone, MessageSquare, Loader2, AlertCircle } from 'lucide-react';

interface BookingData {
  id: number;
  tour_title: string;
  booking_date: string;
  participants_count: number;
  tourist_name: string;
  tourist_email: string;
  total_price: number;
  operator_name: string;
  operator_phone: string | null;
  operator_telegram: string | null;
}

export default function BookingSuccessClient() {
  const params = useParams();
  const bookingId = parseInt(params.id as string, 10);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/hub/bookings/${bookingId}`);
        const json = await res.json() as { success: boolean; data: BookingData };
        if (json.success) setBooking(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(String(bookingId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatPrice = (p: number) =>
    p.toLocaleString('ru-RU') + ' ₽';

  return (
    <div className="ds-page min-h-screen flex items-center justify-center py-12">
      <div className="max-w-2xl w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <CheckCircle size={64} className="text-[var(--success)]" />
          </div>
          <h1 className="ds-h1 mb-2">Бронирование принято!</h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Оператор свяжется с вами в ближайшее время.
          </p>
        </div>

        {/* Booking details card */}
        <div className="ds-card p-8 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            </div>
          ) : !booking ? (
            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">Не удалось загрузить детали. Номер брони: <b>#{bookingId}</b></span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Booking number */}
              <div className="flex items-center justify-between pb-5 border-b border-[var(--border)]">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Номер бронирования</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">#{booking.id}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-[var(--ocean)] hover:text-[var(--accent)] text-sm transition-colors"
                >
                  <Copy size={16} />
                  {copied ? 'Скопировано' : 'Скопировать'}
                </button>
              </div>

              {/* Tour */}
              <div className="pb-5 border-b border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Тур</p>
                <p className="font-semibold text-[var(--text-primary)] text-lg">{booking.tour_title}</p>
              </div>

              {/* Date + participants */}
              <div className="grid grid-cols-2 gap-4 pb-5 border-b border-[var(--border)]">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Дата</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(booking.booking_date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Участников</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{booking.participants_count}</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="pb-5 border-b border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Сумма</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{formatPrice(booking.total_price)}</p>
              </div>

              {/* Operator contacts */}
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-3">Оператор</p>
                <p className="font-medium text-[var(--text-primary)] mb-2">{booking.operator_name}</p>
                <div className="flex flex-wrap gap-3">
                  {booking.operator_phone && (
                    <a
                      href={`tel:${booking.operator_phone}`}
                      className="flex items-center gap-2 text-sm text-[var(--ocean)] hover:text-[var(--accent)] transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {booking.operator_phone}
                    </a>
                  )}
                  {booking.operator_telegram && (
                    <a
                      href={`https://t.me/${booking.operator_telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[var(--ocean)] hover:text-[var(--accent)] transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {booking.operator_telegram}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/hub/tourist/bookings" className="flex-1">
            <button className="ds-btn ds-btn-primary w-full">
              Мои бронирования
            </button>
          </Link>
          <Link href="/marketplace" className="flex-1">
            <button className="ds-btn ds-btn-secondary w-full flex items-center justify-center gap-2">
              <Home size={16} />
              В каталог
            </button>
          </Link>
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          Подтверждение отправлено на {booking?.tourist_email ?? 'ваш email'}
        </p>
      </div>
    </div>
  );
}
