'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { CheckCircle, Copy, Home, Calendar, Users, Phone, MessageSquare, Loader2, AlertCircle, CreditCard, BadgeCheck } from 'lucide-react';

interface BookingData {
  id: number;
  tour_title: string;
  booking_date: string;
  participants_count: number;
  tourist_name: string;
  tourist_email: string;
  status: string;
  payment_status: string;
  total_price: number;
  operator_name: string;
  operator_phone: string | null;
  operator_telegram: string | null;
  cp_public_id: string;
}

declare global {
  interface Window {
    cp?: {
      CloudPayments: new () => {
        charge: (payment: Record<string, unknown>, callbacks: {
          onSuccess: (opts: { transactionId: number }) => void;
          onFail: (reason: string, opts: { reasonCode?: number }) => void;
          onComplete: (result: unknown, opts: unknown) => void;
        }) => void;
      };
    };
  }
}

export default function BookingSuccessClient() {
  const params = useParams();
  const bookingId = parseInt(params.id as string, 10);

  const [booking, setBooking]     = useState<BookingData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [cpReady, setCpReady]     = useState(false);
  const [paying, setPaying]       = useState(false);
  const [paid, setPaid]           = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch(`/api/hub/bookings/${bookingId}`);
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

  const handlePay = useCallback(() => {
    if (!booking || !window.cp || !cpReady) return;
    setPaying(true);

    const widget = new window.cp.CloudPayments();
    widget.charge(
      {
        publicId:    booking.cp_public_id,
        description: `Тур «${booking.tour_title}» — бронь #${booking.id}`,
        amount:      booking.total_price,
        currency:    'RUB',
        invoiceId:   String(booking.id),
        accountId:   booking.tourist_email || booking.tourist_name,
        data:        { bookingId: booking.id, source: 'booking_success' },
      },
      {
        onSuccess: () => { setPaying(false); setPaid(true); },
        onFail:    () => { setPaying(false); },
        onComplete: () => { setPaying(false); },
      }
    );
  }, [booking, cpReady]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatPrice = (p: number) =>
    p.toLocaleString('ru-RU') + ' ₽';

  const needsPayment = booking && !paid &&
    booking.payment_status !== 'paid' &&
    ['new', 'pending_payment', 'confirmed'].includes(booking.status);

  return (
    <div className="ds-page min-h-screen flex items-center justify-center py-12">
      <Script
        src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"
        onLoad={() => setCpReady(true)}
        strategy="afterInteractive"
      />

      <div className="max-w-2xl w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            {paid
              ? <BadgeCheck size={64} className="text-[var(--success)]" />
              : <CheckCircle size={64} className="text-[var(--success)]" />
            }
          </div>
          <h1 className="ds-h1 mb-2">
            {paid ? 'Оплата прошла!' : 'Бронирование принято!'}
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            {paid
              ? 'Оператор получил уведомление и свяжется с вами.'
              : 'Оплатите тур — оператор получит уведомление автоматически.'}
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
              <div className={needsPayment ? '' : 'pb-5 border-b border-[var(--border)]'}>
                <p className="text-xs text-[var(--text-muted)] mb-1">Сумма</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{formatPrice(booking.total_price)}</p>
              </div>

              {/* Payment button */}
              {needsPayment && booking.cp_public_id && (
                <div className="pt-2">
                  <button
                    onClick={handlePay}
                    disabled={!cpReady || paying}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    {paying
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Обработка...</>
                      : !cpReady
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</>
                        : <><CreditCard className="w-4 h-4" /> Оплатить {formatPrice(booking.total_price)}</>
                    }
                  </button>
                  <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                    Безопасная оплата картой · CloudPayments
                  </p>
                </div>
              )}

              {/* Already paid */}
              {(paid || booking.payment_status === 'paid') && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg"
                  style={{ background: 'var(--success)', opacity: 0.15 }}>
                  <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>Оплачено</p>
                </div>
              )}

              {/* Operator contacts */}
              {(booking.operator_phone || booking.operator_telegram) && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-3">Оператор</p>
                  <p className="font-medium text-[var(--text-primary)] mb-2">{booking.operator_name}</p>
                  <div className="flex flex-wrap gap-3">
                    {booking.operator_phone && (
                      <a href={`tel:${booking.operator_phone}`}
                        className="flex items-center gap-2 text-sm text-[var(--ocean)] hover:text-[var(--accent)] transition-colors">
                        <Phone className="w-4 h-4" />
                        {booking.operator_phone}
                      </a>
                    )}
                    {booking.operator_telegram && (
                      <a href={`https://t.me/${booking.operator_telegram.replace('@', '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--ocean)] hover:text-[var(--accent)] transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        {booking.operator_telegram}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/hub/tourist/bookings" className="flex-1">
            <button className="ds-btn ds-btn-primary w-full">Мои бронирования</button>
          </Link>
          <Link href="/marketplace" className="flex-1">
            <button className="ds-btn ds-btn-secondary w-full flex items-center justify-center gap-2">
              <Home size={16} />
              В каталог
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
