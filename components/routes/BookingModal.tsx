'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Calendar, Users, MessageSquare, CheckCircle, Loader2, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CloudPaymentsWidget } from '@/components/payments/CloudPaymentsWidget';

interface Departure {
  id: string;
  start_date: string;
  end_date: string;
  free_slots: number;
  available_slots: number;
  price: number | null;
  notes: string | null;
}

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  tourId: string;
  tourName: string;
  operatorName: string;
  priceBase: number | null;
  minGroupSize: number | null;
  maxGroupSize: number | null;
}

type Step = 'form' | 'payment' | 'success';

interface PaymentData {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  invoiceId: string;
  accountId: string;
  email: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BookingModal({
  open,
  onClose,
  tourId,
  tourName,
  operatorName,
  priceBase,
  minGroupSize,
  maxGroupSize,
}: BookingModalProps) {
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>('form');
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loadingDepartures, setLoadingDepartures] = useState(false);

  const [selectedDepartureId, setSelectedDepartureId] = useState('');
  const [participants, setParticipants] = useState(minGroupSize ?? 1);
  const [specialRequests, setSpecialRequests] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [bookingId, setBookingId] = useState('');

  const firstFieldRef = useRef<HTMLSelectElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('form');
      setSelectedDepartureId('');
      setParticipants(minGroupSize ?? 1);
      setSpecialRequests('');
      setFormError('');
      setPaymentData(null);
      setBookingId('');
      if (user) setTimeout(() => firstFieldRef.current?.focus(), 60);
    }
  }, [open, user, minGroupSize]);

  // Fetch departures when modal opens with auth
  useEffect(() => {
    if (!open || !user) return;
    setLoadingDepartures(true);
    fetch(`/api/tours/${tourId}/departures`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setDepartures(j.data ?? []);
          if (j.data?.length > 0) setSelectedDepartureId(j.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDepartures(false));
  }, [open, user, tourId]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const selectedDeparture = departures.find(d => d.id === selectedDepartureId);
  const effectivePrice = selectedDeparture?.price ?? priceBase;
  const totalAmount = effectivePrice != null ? effectivePrice * participants : null;
  const minP = minGroupSize ?? 1;
  const maxP = selectedDeparture ? Math.min(maxGroupSize ?? 20, selectedDeparture.free_slots) : (maxGroupSize ?? 20);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDepartureId) { setFormError('Выберите дату заезда'); return; }
    setFormError('');
    setSubmitting(true);

    try {
      // 1. Create booking
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          departureId: selectedDepartureId,
          participants,
          specialRequests: specialRequests.trim() || undefined,
        }),
      });
      const bookingJson = await bookingRes.json();
      if (!bookingJson.success) {
        setFormError(bookingJson.error ?? 'Ошибка создания бронирования');
        return;
      }

      const newBookingId: string = bookingJson.data.id;
      const amount: number = parseFloat(bookingJson.data.totalAmount ?? bookingJson.data.total_price ?? totalAmount ?? 0);
      setBookingId(newBookingId);

      // 2. Create payment record
      const paymentRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: newBookingId,
          bookingType: 'tour',
          amount,
          currency: 'RUB',
          description: `${tourName} · ${formatDate(selectedDeparture?.start_date ?? '')} · ${participants} чел.`,
        }),
      });
      const paymentJson = await paymentRes.json();
      if (!paymentJson.success) {
        // Booking created, but payment init failed — still go to payment step
        setFormError(paymentJson.error ?? 'Ошибка инициализации оплаты');
        return;
      }

      setPaymentData(paymentJson.data);
      setStep('payment');
    } catch {
      setFormError('Нет связи. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors z-10"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="mb-5 pr-6">
            <h2 id="booking-modal-title" className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-playfair)' }}>
              {step === 'success' ? 'Бронирование оформлено' : 'Забронировать тур'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{tourName}</p>
            <p className="text-xs text-[var(--text-secondary)]">{operatorName}</p>
          </div>

          {/* ── Step: form ── */}
          {step === 'form' && (
            <>
              {/* Not logged in */}
              {!authLoading && !user && (
                <div className="py-6 text-center space-y-4">
                  <LogIn className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Для бронирования необходимо войти в аккаунт.
                  </p>
                  <Link
                    href={`/auth/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
                    className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Войти для бронирования
                  </Link>
                </div>
              )}

              {/* Loading auth */}
              {authLoading && (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                </div>
              )}

              {/* Logged in — booking form */}
              {!authLoading && user && (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Departure date */}
                  <div>
                    <label htmlFor="bm-departure" className="ds-label mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Дата заезда <span className="text-[var(--accent)]">*</span>
                    </label>
                    {loadingDepartures ? (
                      <div className="ds-input flex items-center gap-2 text-[var(--text-muted)]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-sm">Загрузка дат…</span>
                      </div>
                    ) : departures.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--warning)] bg-[var(--warning)]/10 px-3 py-2 rounded">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Доступных дат нет. Оставьте заявку на удобную дату в комментарии.
                      </div>
                    ) : (
                      <select
                        ref={firstFieldRef}
                        id="bm-departure"
                        value={selectedDepartureId}
                        onChange={e => setSelectedDepartureId(e.target.value)}
                        className="ds-input w-full"
                        required
                      >
                        {departures.map(d => (
                          <option key={d.id} value={d.id}>
                            {formatDate(d.start_date)}
                            {d.end_date !== d.start_date ? ` — ${formatDate(d.end_date)}` : ''}
                            {` · ${d.free_slots} мест`}
                            {d.price != null ? ` · ${d.price.toLocaleString('ru-RU')} ₽` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Participants */}
                  <div>
                    <label htmlFor="bm-participants" className="ds-label mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Количество участников <span className="text-[var(--accent)]">*</span>
                    </label>
                    <input
                      id="bm-participants"
                      type="number"
                      className="ds-input w-full"
                      min={minP}
                      max={maxP}
                      value={participants}
                      onChange={e => setParticipants(Math.max(minP, Math.min(maxP, parseInt(e.target.value) || minP)))}
                      required
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      От {minP} до {maxP} человек
                    </p>
                  </div>

                  {/* Special requests */}
                  <div>
                    <label htmlFor="bm-requests" className="ds-label mb-1 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Особые пожелания
                    </label>
                    <textarea
                      id="bm-requests"
                      className="ds-input w-full resize-none"
                      rows={3}
                      placeholder="Снаряжение, аллергии, специальные требования…"
                      value={specialRequests}
                      onChange={e => setSpecialRequests(e.target.value)}
                      maxLength={1000}
                    />
                  </div>

                  {/* Price summary */}
                  {totalAmount != null && totalAmount > 0 && (
                    <div className="flex items-center justify-between bg-[var(--bg-hover)] px-3 py-2 rounded text-sm">
                      <span className="text-[var(--text-secondary)]">Итого</span>
                      <span className="font-bold text-[var(--accent)]">
                        {totalAmount.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  )}

                  {formError && (
                    <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || (departures.length > 0 && !selectedDepartureId)}
                    className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? 'Оформляем…' : 'Перейти к оплате'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── Step: payment ── */}
          {step === 'payment' && paymentData && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-hover)] rounded-lg p-3 space-y-1 text-sm">
                {selectedDeparture && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Дата заезда</span>
                    <span className="text-[var(--text-primary)]">{formatDate(selectedDeparture.start_date)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Участники</span>
                  <span className="text-[var(--text-primary)]">{participants} чел.</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-[var(--text-secondary)]">К оплате</span>
                  <span className="text-[var(--accent)]">{paymentData.amount.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                После нажатия откроется защищённая форма оплаты CloudPayments.
              </p>

              {formError && (
                <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded">
                  {formError}
                </p>
              )}

              <CloudPaymentsWidget
                amount={paymentData.amount}
                currency={paymentData.currency}
                description={paymentData.description}
                invoiceId={paymentData.invoiceId}
                accountId={paymentData.accountId}
                email={paymentData.email}
                onSuccess={() => setStep('success')}
                onFail={reason => setFormError(`Ошибка оплаты: ${reason}`)}
                buttonText="Оплатить"
                buttonClassName="ds-btn ds-btn-primary w-full flex items-center justify-center gap-1.5 py-3"
              />

              <button
                type="button"
                onClick={() => setStep('form')}
                className="ds-btn ds-btn-secondary w-full text-sm"
              >
                Назад
              </button>
            </div>
          )}

          {/* ── Step: success ── */}
          {step === 'success' && (
            <div className="py-4 text-center space-y-3">
              <CheckCircle className="w-12 h-12 mx-auto text-[var(--success)]" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Оплата прошла успешно!
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Бронирование подтверждено. Оператор свяжется с вами для уточнения деталей.
              </p>
              {bookingId && (
                <p className="text-xs text-[var(--text-muted)]">
                  Номер бронирования: <span className="font-mono">{bookingId.substring(0, 8).toUpperCase()}</span>
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Link href="/bookings" className="ds-btn ds-btn-secondary flex-1 text-sm text-center">
                  Мои бронирования
                </Link>
                <button type="button" onClick={onClose} className="ds-btn ds-btn-primary flex-1 text-sm">
                  Закрыть
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
