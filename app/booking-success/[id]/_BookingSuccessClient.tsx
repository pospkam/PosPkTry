'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import {
  CheckCircle, Copy, Home, Calendar, Users, Phone,
  MessageSquare, Loader2, AlertCircle, CreditCard, BadgeCheck, ExternalLink,
  FileText, Ticket,
} from 'lucide-react';

interface BookingData {
  id: number;
  tour_title: string;
  booking_date: string;
  participants_count: number;
  tourist_name: string;
  status: string;
  payment_status: string;
  total_price: number;
  operator_name: string;
  operator_phone: string | null;
  operator_telegram: string | null;
  cp_public_id: string;
  pdf_token: string;
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
  const params    = useParams();
  const bookingId = parseInt(params.id as string, 10);

  const [booking,  setBooking]  = useState<BookingData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [copied,   setCopied]   = useState(false);
  const [cpReady,  setCpReady]  = useState(false);
  const [paying,   setPaying]   = useState(false);
  const [paid,     setPaid]     = useState(false);

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
        accountId:   booking.tourist_name,
        data:        { bookingId: booking.id, source: 'booking_success' },
      },
      {
        onSuccess: () => { setPaying(false); setPaid(true); },
        onFail:    () => { setPaying(false); },
        onComplete: () => { setPaying(false); },
      }
    );
  }, [booking, cpReady]);

  const fmtDate  = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtPrice = (p: number) =>
    p.toLocaleString('ru-RU') + ' ₽';

  const alreadyPaid  = paid || booking?.payment_status === 'paid';
  const needsPayment = booking && !alreadyPaid &&
    ['new', 'pending_payment', 'confirmed'].includes(booking.status ?? '');

  // Определяем: открыто ли в Telegram WebView (блокирует попапы)
  const isInTgWebView = typeof navigator !== 'undefined' &&
    /Telegram/i.test(navigator.userAgent);

  return (
    <div className="ds-page min-h-[100dvh] flex items-start justify-center py-6 sm:py-12 px-4">
      <Script
        src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"
        onLoad={() => setCpReady(true)}
        strategy="afterInteractive"
      />

      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-4">
            {alreadyPaid
              ? <BadgeCheck size={56} className="text-[var(--success)]" />
              : <CheckCircle size={56} className="text-[var(--success)]" />
            }
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1"
            style={{ fontFamily: 'var(--font-playfair)' }}>
            {alreadyPaid ? 'Оплата получена' : 'Заявка создана'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {alreadyPaid
              ? 'Оператор получил уведомление об оплате и подтвердит дальнейшие детали поездки.'
              : 'Проверьте данные заявки и переходите к оплате, если всё подходит.'}
          </p>
        </div>

        {/* Card */}
        <div className="ds-card p-5 sm:p-7 mb-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            </div>
          ) : !booking ? (
            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">Не удалось загрузить данные. Номер: <b>#{bookingId}</b></span>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Booking number */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div>
                  <p className="text-[11px] text-[var(--text-muted)] mb-0.5">Номер брони</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">#{booking.id}</p>
                </div>
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-[var(--ocean)] hover:text-[var(--accent)] transition-colors">
                  <Copy size={14} />
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>

              {/* Tour */}
              <div className="pb-4 border-b border-[var(--border)]">
                <p className="text-[11px] text-[var(--text-muted)] mb-0.5">Тур</p>
                <p className="font-semibold text-[var(--text-primary)]">{booking.tour_title}</p>
              </div>

              {/* Date + participants */}
              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-[var(--border)]">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)]">Дата</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{fmtDate(booking.booking_date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)]">Человек</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{booking.participants_count}</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className={needsPayment ? '' : 'pb-4 border-b border-[var(--border)]'}>
                <p className="text-[11px] text-[var(--text-muted)] mb-0.5">Сумма</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{fmtPrice(booking.total_price)}</p>
              </div>

              {/* Pay button */}
              {needsPayment && booking.cp_public_id && (
                <div className="pt-1 space-y-2">
                  {/* Telegram WebView warning */}
                  {isInTgWebView && (
                    <a
                      href={`https://tourhab.ru/booking-success/${booking.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] transition-colors"
                    >
                      <ExternalLink size={14} />
                      Открыть в браузере для оплаты
                    </a>
                  )}
                  <button
                    onClick={handlePay}
                    disabled={!cpReady || paying}
                    className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 text-base"
                    style={{ background: 'var(--accent)' }}
                  >
                    {paying
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Обработка...</>
                      : !cpReady
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</>
                        : <><CreditCard className="w-4 h-4" /> Перейти к оплате {fmtPrice(booking.total_price)}</>
                    }
                  </button>
                  <p className="text-[11px] text-center text-[var(--text-muted)]">
                    Перед оплатой убедитесь, что дата, количество участников и условия тура вам подходят.
                  </p>
                  <p className="text-[11px] text-center text-[var(--text-muted)]">
                    Безопасная оплата картой · CloudPayments
                  </p>
                </div>
              )}

              {/* Paid badge */}
              {alreadyPaid && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)' }}>
                  <BadgeCheck className="w-4 h-4 shrink-0 text-[var(--success)]" />
                  <p className="text-sm font-semibold text-[var(--success)]">Оплата подтверждена</p>
                </div>
              )}

              {/* Operator */}
              {(booking.operator_phone || booking.operator_telegram) && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-[11px] text-[var(--text-muted)] mb-2">Оператор</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{booking.operator_name}</p>
                  <div className="flex flex-wrap gap-3">
                    {booking.operator_phone && (
                      <a href={`tel:${booking.operator_phone}`}
                        className="flex items-center gap-1.5 text-sm text-[var(--ocean)] hover:text-[var(--accent)] transition-colors">
                        <Phone className="w-4 h-4" />
                        {booking.operator_phone}
                      </a>
                    )}
                    {booking.operator_telegram && (
                      <a href={`https://t.me/${booking.operator_telegram.replace('@', '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-[var(--ocean)] hover:text-[var(--accent)] transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        Telegram
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-2">
                    По этим контактам можно уточнить программу, экипировку и другие детали до выезда.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PDF Documents */}
        {booking && (
          <div className="flex gap-3 mb-3">
            <a
              href={`/api/hub/bookings/${booking.id}/pdf?type=voucher&token=${booking.pdf_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-colors"
            >
              <Ticket size={15} />
              Ваучер (PDF)
            </a>
            <a
              href={`/api/hub/bookings/${booking.id}/pdf?type=contract&token=${booking.pdf_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-colors"
            >
              <FileText size={15} />
              Договор (PDF)
            </a>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link href="/hub/tourist/bookings">
            <button className="ds-btn ds-btn-primary w-full">Мои бронирования</button>
          </Link>
          <Link href="/marketplace">
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
