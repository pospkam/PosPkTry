'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Copy, Home } from 'lucide-react';

interface BookingDetails {
  booking_id: number;
  tour_title?: string;
  operator_contact?: string;
  total_price?: number;
  status: string;
}

export default function BookingSuccessClient() {
  const params = useParams();
  const bookingId = parseInt(params.id as string);

  const [booking, setBooking] = useState<BookingDetails>({
    booking_id: bookingId,
    status: 'confirmed'
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // In a real app, you would fetch booking details from an API
    // For now, show basic confirmation
    setBooking({
      booking_id: bookingId,
      status: 'confirmed'
    });
  }, [bookingId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ds-page min-h-screen flex items-center justify-center py-12">
      <div className="max-w-2xl w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <CheckCircle size={64} className="text-[var(--success)]" />
          </div>

          <h1 className="ds-h1 mb-2">Бронирование подтверждено!</h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Спасибо за ваше доверие. Оператор свяжется с вами в ближайшее время.
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="ds-card p-8 mb-8">
          <h2 className="ds-h2 mb-6">Данные бронирования</h2>

          <div className="space-y-6">
            {/* Booking ID */}
            <div className="pb-6 border-b border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-2">Номер бронирования</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-[var(--accent)]">#{bookingId}</p>
                <button
                  onClick={() => handleCopy(bookingId.toString())}
                  className="flex items-center gap-2 text-[var(--ocean)] hover:text-[var(--accent)] text-sm transition-colors"
                >
                  <Copy size={16} />
                  {copied ? 'Скопировано' : 'Скопировать'}
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="pb-6 border-b border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-2">Статус</p>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[var(--success)]" />
                <p className="text-[var(--text-primary)] font-semibold">Подтвержено</p>
              </div>
            </div>

            {/* Next Steps */}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-3">Что дальше?</p>
              <ol className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-3">
                  <span className="text-[var(--accent)] font-bold flex-shrink-0">1.</span>
                  <span>Оператор свяжется с вами в течение 1 часа</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--accent)] font-bold flex-shrink-0">2.</span>
                  <span>Уточните детали и время встречи</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--accent)] font-bold flex-shrink-0">3.</span>
                  <span>Оплатите тур перед началом (если ещё не оплачено)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--accent)] font-bold flex-shrink-0">4.</span>
                  <span>Наслаждайтесь приключением на Камчатке!</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Info Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[var(--bg-hover)] rounded-lg p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Контакт оператора</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              После бронирования оператор напишет вам в WhatsApp или позвонит по указанному номеру.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Если контакта нет в течение 1 часа, напишите нам в поддержку.
            </p>
          </div>

          <div className="bg-[var(--bg-hover)] rounded-lg p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Возврат средств</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Вы можете отменить бронирование и получить возврат за 48 часов до начала тура.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Возврат 100% стоимости без комиссий.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/marketplace" className="flex-1">
            <button className="ds-btn ds-btn-secondary w-full flex items-center justify-center gap-2">
              <Home size={16} />
              Вернуться в каталог
            </button>
          </Link>

          <a href="/" className="flex-1">
            <button className="ds-btn ds-btn-primary w-full">
              На главную
            </button>
          </a>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-[var(--text-muted)] text-center mt-8">
          Номер бронирования отправлен на ваш email. Сохраните его для справки.
        </p>
      </div>
    </div>
  );
}
