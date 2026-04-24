'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Calendar, Users, MessageSquare, CheckCircle, Loader2, LogIn, AlertCircle, Phone, Shield, ExternalLink, Plane, Hotel, Car, Map, Navigation } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  tourId: string | number;
  tourName: string;
  operatorName: string;
  priceBase: number | null;
  minGroupSize: number | null;
  maxGroupSize: number | null;
}

type Step = 'form' | 'success';

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
  const [desiredDate, setDesiredDate] = useState('');
  const [participants, setParticipants] = useState(minGroupSize ?? 1);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [bookingId, setBookingId] = useState('');

  const firstFieldRef = useRef<HTMLSelectElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('form');
      setSelectedDepartureId('');
      setDesiredDate('');
      setParticipants(minGroupSize ?? 1);
      setExperienceLevel('');
      setSpecialRequests('');
      setFormError('');
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

  const hasDepartures = departures.length > 0;
  const selectedDeparture = departures.find(d => d.id === selectedDepartureId);
  const effectivePrice = selectedDeparture?.price ?? priceBase;
  const totalAmount = effectivePrice != null ? effectivePrice * participants : null;
  const minP = minGroupSize ?? 1;
  const maxP = selectedDeparture ? Math.min(maxGroupSize ?? 20, selectedDeparture.free_slots) : (maxGroupSize ?? 20);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasDepartures && !selectedDepartureId) {
      setFormError('Выберите дату заезда');
      return;
    }
    if (!hasDepartures && !desiredDate.trim()) {
      setFormError('Укажите желаемую дату');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      const experienceLabel: Record<string, string> = {
        first: 'Первый раз в походе',
        been: 'Бывал на Камчатке',
        experienced: 'Опытный турист',
      };
      const parts = [
        experienceLevel ? `Опыт: ${experienceLabel[experienceLevel]}` : '',
        specialRequests.trim(),
      ].filter(Boolean);

      const body: Record<string, unknown> = {
        tourId,
        participants,
        specialRequests: parts.length ? parts.join('. ') : undefined,
      };
      if (hasDepartures && selectedDepartureId) {
        body.departureId = selectedDepartureId;
      } else {
        body.date = desiredDate;
        body.specialRequests = [
          desiredDate ? `Желаемая дата: ${desiredDate}` : '',
          specialRequests.trim(),
        ].filter(Boolean).join('. ');
      }

      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const bookingJson = await bookingRes.json();
      if (!bookingJson.success) {
        setFormError(bookingJson.error ?? 'Ошибка создания заявки');
        return;
      }

      setBookingId(bookingJson.data.id);
      setStep('success');
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
              {step === 'success' ? 'Заявка принята' : 'Оставить заявку'}
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
                    Для оформления заявки необходимо войти в аккаунт.
                  </p>
                  <Link
                    href={`/auth/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
                    className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Войти для оформления
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
                    ) : hasDepartures ? (
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
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[var(--warning)] bg-[var(--warning)]/10 px-3 py-2 rounded">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Готовых дат нет — укажите удобный период, оператор подберёт дату.
                        </div>
                        <input
                          type="text"
                          className="ds-input w-full"
                          placeholder="Например: июль 2026, 2 недели"
                          value={desiredDate}
                          onChange={e => setDesiredDate(e.target.value)}
                          maxLength={100}
                        />
                      </div>
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

                  {/* Experience level */}
                  <div>
                    <label htmlFor="bm-experience" className="ds-label mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Ваш опыт в походах
                    </label>
                    <select
                      id="bm-experience"
                      value={experienceLevel}
                      onChange={e => setExperienceLevel(e.target.value)}
                      className="ds-input w-full"
                    >
                      <option value="">— не указывать —</option>
                      <option value="first">Первый раз в походе</option>
                      <option value="been">Бывал на Камчатке</option>
                      <option value="experienced">Опытный турист</option>
                    </select>
                  </div>

                  {/* Special requests */}
                  <div>
                    <label htmlFor="bm-requests" className="ds-label mb-1 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Комментарий
                    </label>
                    <textarea
                      id="bm-requests"
                      className="ds-input w-full resize-none"
                      rows={3}
                      placeholder="Снаряжение, аллергии, вопросы…"
                      value={specialRequests}
                      onChange={e => setSpecialRequests(e.target.value)}
                      maxLength={1000}
                    />
                  </div>

                  {/* Price summary */}
                  {totalAmount != null && totalAmount > 0 && (
                    <div className="flex items-center justify-between bg-[var(--bg-hover)] px-3 py-2 rounded text-sm">
                      <span className="text-[var(--text-secondary)]">Ориентировочная стоимость</span>
                      <span className="font-bold text-[var(--accent)]">
                        {totalAmount.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  )}

                  {/* Info: no online payment */}
                  <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-3 py-2 rounded">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Оплата при подтверждении — оператор свяжется с вами в течение 24 часов.</span>
                  </div>

                  {formError && (
                    <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? 'Отправляем…' : 'Отправить заявку'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── Step: success ── */}
          {step === 'success' && (
            <div className="py-4 space-y-4">
              <div className="text-center space-y-3">
                <CheckCircle className="w-12 h-12 mx-auto text-[var(--success)]" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Заявка отправлена!
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Оператор получил уведомление и свяжется с вами в течение 24 часов для подтверждения и оплаты.
                </p>
                {bookingId && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Номер заявки: <span className="font-mono">{bookingId.substring(0, 8).toUpperCase()}</span>
                  </p>
                )}
              </div>

              {/* Insurance block */}
              <div className="border border-[var(--border)] rounded-lg p-4 space-y-3 bg-[var(--bg-hover)]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--ocean)] shrink-0" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Застрахуйте поездку</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Вулканы, вертолёты, бездорожье — Камчатка требует страховки с покрытием активного отдыха. Оформите за 5 минут.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://www.tinkoff.ru/insurance/travel/?utm_source=tourhab&utm_medium=booking_success&utm_campaign=insurance"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Тинькофф
                  </a>
                  <a
                    href="https://www.ingos.ru/travel/?utm_source=tourhab&utm_medium=booking_success&utm_campaign=insurance"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ингосстрах
                  </a>
                </div>
              </div>

              {/* Useful links — flights, hotels, transfers, excursions */}
              <div className="border border-[var(--border)] rounded-lg p-4 space-y-3 bg-[var(--bg-hover)]">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Полезно для поездки</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://www.aviasales.ru/search/MOW0000PKC1?marker=402896"
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-all"
                  >
                    <Plane className="w-3 h-3" /> Авиабилеты
                  </a>
                  <a
                    href="https://yandex.travel/hotels/petropavlovsk-kamchatsky/?clid=4910087&affiliate_vid=402896&utm_campaign=tourhab.ru&utm_medium=cpa&utm_source=travelpayouts"
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-all"
                  >
                    <Hotel className="w-3 h-3" /> Отели
                  </a>
                  <a
                    href="https://kiwitaxi.ru/?aff_id=402896"
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-all"
                  >
                    <Car className="w-3 h-3" /> Трансфер
                  </a>
                  <a
                    href="https://experience.tripster.ru/kamchatka/?erid=2VtzqvHHd1p&partner=402896&utm_campaign=affiliates&utm_medium=link&utm_source=travelpayouts"
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-all"
                  >
                    <Map className="w-3 h-3" /> Экскурсии
                  </a>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href="/hub/tourist/bookings" className="ds-btn ds-btn-secondary flex-1 text-sm text-center">
                  Мои заявки
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
