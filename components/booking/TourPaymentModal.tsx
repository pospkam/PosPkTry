'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import {
  X, Calendar, Users, CreditCard, CheckCircle,
  Loader2, AlertTriangle, LogIn, Phone,
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
      if (user) setTimeout(() => dateInputRef.current?.focus(), 60);
    }
  }, [open, user, minGroupSize, nextDeparture]);

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

            {/* ── Не авторизован ── */}
            {!authLoading && !user && (
              <div className="py-6 text-center space-y-4">
                <LogIn className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Для бронирования необходима авторизация
                </p>
                <Link
                  href={`/auth/login?from=${encodeURIComponent('/routes')}`}
                  className="ds-btn ds-btn-primary px-6 py-2.5 text-sm font-semibold"
                >
                  Войти
                </Link>
              </div>
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
                      {total != null ? `Оплатить ${fmtPrice(total)} ₽` : 'Перейти к оплате'}
                    </>
                  )}
                </button>

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
                    Бронирование подтверждено. Оператор получит уведомление.
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
