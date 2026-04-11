'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import {
  X, Calendar, Users, CreditCard, CheckCircle,
  Loader2, AlertTriangle, Phone, User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourPaymentModalProps {
  open: boolean;
  onClose: () => void;
  tourId: number;
  tourName: string;
  operatorName: string;
  priceBase: number | null;
  minGroupSize: number | null;
  maxGroupSize: number | null;
  nextDeparture: string | null;
}

interface PaymentData {
  bookingId: string;
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  invoiceId: string;
  accountId: string;
  email: string;
}

type Step = 'form' | 'paying' | 'success' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  return n.toLocaleString('ru-RU');
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function maxDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TourPaymentModal({
  open,
  onClose,
  tourId,
  tourName,
  operatorName,
  priceBase,
  minGroupSize,
  maxGroupSize,
  nextDeparture,
}: TourPaymentModalProps) {
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep]           = useState<Step>('form');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Available slots from tour_availability
  const [availSlots, setAvailSlots] = useState<{ date: string; free_slots: number }[]>([]);

  // Form
  const [bookingDate, setBookingDate]       = useState('');
  const [participants, setParticipants]     = useState(minGroupSize ?? 1);
  const [touristPhone, setTouristPhone]     = useState('');
  const [formError, setFormError]           = useState('');
  const [submitting, setSubmitting]         = useState(false);

  // Post-booking
  const [paymentData, setPaymentData]   = useState<PaymentData | null>(null);
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const [payError, setPayError]         = useState('');

  // Guest lead (unauthenticated flow)
  const [guestName, setGuestName]       = useState('');
  const [guestPhone, setGuestPhone]     = useState('');
  const [guestConsent, setGuestConsent] = useState(false);
  const [guestDone, setGuestDone]       = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError]     = useState('');

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('form');
      setBookingDate(nextDeparture ? nextDeparture.slice(0, 10) : tomorrow());
      setParticipants(minGroupSize ?? 1);
      setTouristPhone('');
      setFormError('');
      setPaymentData(null);
      setTransactionId(null);
      setPayError('');
      setGuestName('');
      setGuestPhone('');
      setGuestConsent(false);
      setGuestDone(false);
      setGuestLoading(false);
      setGuestError('');
      if (user) setTimeout(() => dateInputRef.current?.focus(), 60);

      // Загружаем реальные доступные даты
      fetch(`/api/tours/${tourId}/slots`)
        .then(r => r.ok ? r.json() : { slots: [] })
        .then(data => setAvailSlots(data.slots ?? []))
        .catch(() => setAvailSlots([]));
    }
  }, [open, user, minGroupSize, nextDeparture, tourId]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const minP   = minGroupSize ?? 1;
  const maxP   = maxGroupSize ?? 20;
  const price  = priceBase;
  const total  = price != null ? price * participants : null;

  // ── Guest lead submit (unauthenticated) ─────────────────────────────────────

  async function handleGuestLead(e: React.FormEvent) {
    e.preventDefault();
    setGuestError('');
    setGuestLoading(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        guestName.trim(),
          phone:       guestPhone.trim(),
          comment:     `Интерес к туру: ${tourName} (оператор: ${operatorName})`,
          route_title: tourName,
          source_data: { source: 'booking_modal_guest' },
        }),
      });
      const json: { success: boolean; error?: string } = await res.json();
      if (json.success) setGuestDone(true);
      else setGuestError(json.error ?? 'Ошибка. Попробуйте ещё раз.');
    } catch {
      setGuestError('Нет связи. Проверьте интернет.');
    } finally {
      setGuestLoading(false);
    }
  }

  // ── Step: form ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingDate) { setFormError('Выберите дату'); return; }
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings/tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          bookingDate,
          participants,
          touristPhone: touristPhone.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setFormError(json.error ?? 'Ошибка создания бронирования');
        return;
      }

      const pd = json.data as PaymentData;
      setPaymentData(pd);

      if (!window.cp?.CloudPayments) {
        setFormError('Платёжная система ещё загружается. Попробуйте через несколько секунд.');
        return;
      }

      const publicId = process.env.NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID ?? '';
      if (!publicId) {
        setFormError('Платёжная система не настроена. Свяжитесь с администратором.');
        return;
      }

      setStep('paying');

      const widget = new window.cp!.CloudPayments();
      widget.charge(
        {
          publicId,
          description: pd.description,
          amount:      pd.amount,
          currency:    pd.currency,
          invoiceId:   pd.invoiceId,
          accountId:   pd.accountId,
          email:       pd.email,
          data:        { booking_id: pd.bookingId },
        },
        {
          onSuccess: (opts) => {
            setTransactionId(opts.transactionId);
            setStep('success');
          },
          onFail: (reason) => {
            setPayError(reason || 'Платёж отклонён');
            setStep('error');
          },
          onComplete: () => {},
        }
      );
    } catch {
      setFormError('Нет связи. Проверьте интернет и попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Script
        src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"
        onLoad={() => setScriptLoaded(true)}
        strategy="afterInteractive"
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-pay-modal-title"
        >
          {/* Закрыть */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors z-10"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6">
            {/* Заголовок */}
            <div className="mb-5 pr-6">
              <h2 id="tour-pay-modal-title"
                className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-playfair)' }}>
                {step === 'success' ? 'Оплата прошла' : step === 'error' ? 'Ошибка оплаты' : 'Забронировать тур'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{tourName}</p>
              <p className="text-xs text-[var(--text-secondary)]">{operatorName}</p>
            </div>

            {/* ── Не авторизован → лид-форма ── */}
            {!authLoading && !user && (
              guestDone ? (
                <div className="py-6 text-center space-y-3">
                  <CheckCircle className="w-10 h-10 mx-auto text-[var(--success)]" />
                  <p className="text-base font-semibold text-[var(--text-primary)]">Заявка принята!</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Мы свяжемся с вами и оформим бронирование.
                  </p>
                  <button type="button" onClick={onClose} className="ds-btn ds-btn-primary mt-2">Закрыть</button>
                </div>
              ) : (
                <form onSubmit={handleGuestLead} className="space-y-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Оставьте контакт — мы оформим бронирование и пришлём детали.
                  </p>

                  <div>
                    <label className="ds-label mb-1">Имя <span className="text-[var(--accent)]">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="text"
                        className="ds-input pl-8 w-full"
                        placeholder="Ваше имя"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        required
                        maxLength={120}
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="ds-label mb-1">Телефон <span className="text-[var(--accent)]">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="tel"
                        className="ds-input pl-8 w-full"
                        placeholder="+7 (900) 000-00-00"
                        value={guestPhone}
                        onChange={e => setGuestPhone(e.target.value)}
                        required
                        maxLength={30}
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guestConsent}
                      onChange={e => setGuestConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[var(--border)] accent-[var(--accent)] shrink-0 cursor-pointer"
                    />
                    <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Согласен(на) на{' '}
                      <a href="/legal/privacy" target="_blank" className="text-[var(--ocean)] hover:underline">
                        обработку персональных данных
                      </a>
                    </span>
                  </label>

                  {guestError && (
                    <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded">{guestError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={guestLoading || !guestName.trim() || !guestPhone.trim() || !guestConsent}
                    className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {guestLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {guestLoading ? 'Отправляем…' : 'Оставить заявку'}
                  </button>

                  <p className="text-center text-[11px] text-[var(--text-muted)]">
                    Уже есть аккаунт?{' '}
                    <Link
                      href={`/auth/login?from=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/routes')}`}
                      className="text-[var(--ocean)] hover:underline"
                    >
                      Войти и бронировать онлайн
                    </Link>
                  </p>
                </form>
              )
            )}

            {/* ── Загрузка авторизации ── */}
            {authLoading && (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
              </div>
            )}

            {/* ── Форма ── */}
            {!authLoading && user && step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Дата */}
                <div>
                  <label className="ds-label mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Дата тура
                  </label>

                  {/* Доступные слоты из tour_availability */}
                  {availSlots.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {availSlots.slice(0, 8).map(s => {
                        const d = new Date(s.date + 'T00:00:00');
                        const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                        const selected = bookingDate === s.date;
                        const low = s.free_slots <= 3;
                        return (
                          <button
                            key={s.date}
                            type="button"
                            onClick={() => setBookingDate(s.date)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              selected
                                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                : low
                                  ? 'bg-[var(--warning)]/10 border-[var(--warning)]/40 text-[var(--warning)] hover:bg-[var(--warning)]/20'
                                  : 'bg-[var(--bg-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
                            }`}
                          >
                            {label}
                            <span className={`ml-1 text-[10px] ${selected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                              {s.free_slots} м.
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <input
                    ref={dateInputRef}
                    type="date"
                    value={bookingDate}
                    min={tomorrow()}
                    max={maxDate()}
                    onChange={e => setBookingDate(e.target.value)}
                    className="ds-input w-full"
                    required
                  />
                  {availSlots.length > 0 && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Выбери дату выше или введи вручную
                    </p>
                  )}
                </div>

                {/* Участники */}
                <div>
                  <label className="ds-label mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Участники
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setParticipants(p => Math.max(minP, p - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors font-bold text-lg leading-none"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold text-[var(--text-primary)]">{participants}</span>
                    <button
                      type="button"
                      onClick={() => setParticipants(p => Math.min(maxP, p + 1))}
                      className="w-8 h-8 flex items-center justify-center rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors font-bold text-lg leading-none"
                    >
                      +
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">до {maxP}</span>
                  </div>
                </div>

                {/* Телефон (опционально) */}
                <div>
                  <label className="ds-label mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Телефон
                    <span className="font-normal text-[var(--text-muted)]">(необязательно)</span>
                  </label>
                  <input
                    type="tel"
                    value={touristPhone}
                    onChange={e => setTouristPhone(e.target.value)}
                    placeholder="+7 900 000-00-00"
                    className="ds-input w-full"
                  />
                </div>

                {/* Итого */}
                {total != null && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Итого</span>
                    <span className="text-lg font-bold text-[var(--accent)]">{fmtPrice(total)} ₽</span>
                  </div>
                )}

                {/* Ошибка */}
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                    <p className="text-xs text-[var(--danger)]">{formError}</p>
                  </div>
                )}

                {/* Кнопка */}
                <button
                  type="submit"
                  disabled={submitting || !scriptLoaded}
                  className="w-full ds-btn ds-btn-primary py-3 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Создаём бронь…</>
                  ) : !scriptLoaded ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Загрузка…</>
                  ) : (
                    <><CreditCard className="w-4 h-4" />
                      {total != null ? `Перейти к оплате ${fmtPrice(total)} ₽` : 'Перейти к оплате'}
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-[var(--text-muted)]">
                  Перед оплатой проверьте дату, участников и условия участия в туре.
                </p>

                <p className="text-center text-[10px] text-[var(--text-muted)]">
                  Безопасная оплата через CloudPayments
                </p>
              </form>
            )}

            {/* ── Оплата в процессе ── */}
            {!authLoading && user && step === 'paying' && (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-[var(--accent)]" />
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Открываем платёжный виджет…
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Если окно не появилось — проверьте блокировщик всплывающих окон
                </p>
              </div>
            )}

            {/* ── Успех ── */}
            {step === 'success' && (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[var(--success)]/15 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-[var(--success)]" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--text-primary)]">Оплата прошла</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Оплата зафиксирована. Оператор получил уведомление и продолжит подтверждение деталей поездки.
                  </p>
                  {transactionId && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Транзакция: #{transactionId}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="ds-btn ds-btn-secondary px-6 py-2 text-sm"
                >
                  Закрыть
                </button>
              </div>
            )}

            {/* ── Ошибка оплаты ── */}
            {step === 'error' && (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[var(--danger)]/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-[var(--danger)]" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--text-primary)]">Платёж не прошёл</p>
                  {payError && (
                    <p className="text-sm text-[var(--text-secondary)]">{payError}</p>
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setPayError(''); }}
                    className="ds-btn ds-btn-primary px-5 py-2 text-sm font-semibold"
                  >
                    Попробовать снова
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="ds-btn ds-btn-secondary px-5 py-2 text-sm"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
