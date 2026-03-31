'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Phone, User, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { getSourceData } from '@/hooks/useSourceTracker';

interface LeadModalProps {
  open: boolean;
  onClose: () => void;
  routeId?: string;
  routeTitle?: string;
  sourceUrl?: string;
}

export default function LeadModal({ open, onClose, routeId, routeTitle, sourceUrl }: LeadModalProps) {
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [comment, setComment]   = useState('');
  const [pdConsent, setPdConsent] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  // Фокус на первом поле при открытии
  useEffect(() => {
    if (open) {
      setDone(false);
      setError('');
      setPdConsent(false);
      setTimeout(() => nameRef.current?.focus(), 60);
    }
  }, [open]);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!pdConsent) {
      setError('Необходимо согласие на обработку персональных данных');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        name.trim(),
          phone:       phone.trim(),
          comment:     comment.trim() || undefined,
          route_id:    routeId,
          route_title: routeTitle,
          source_url:  sourceUrl ?? (typeof window !== 'undefined' ? window.location.href : undefined),
          source_data: getSourceData() ?? undefined,
        }),
      });
      const json: { success: boolean; error?: string } = await res.json();
      if (json.success) {
        setDone(true);
      } else {
        setError(json.error ?? 'Произошла ошибка. Попробуйте ещё раз.');
      }
    } catch {
      setError('Нет связи. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {done ? (
            /* ── Success state ── */
            <div className="py-6 text-center space-y-3">
              <CheckCircle className="w-12 h-12 mx-auto text-[var(--success)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-playfair)]">
                Заявка принята!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Мы свяжемся с вами в ближайшее время и подберём удобный вариант тура.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="ds-btn ds-btn-primary mt-2"
              >
                Закрыть
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <div className="mb-5">
                <h2
                  id="lead-modal-title"
                  className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-playfair)]"
                >
                  Оставьте заявку
                </h2>
                {routeTitle && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
                    {routeTitle}
                  </p>
                )}
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Мы подберём оператора и дату под ваш запрос — без регистрации.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                {/* Name */}
                <div>
                  <label htmlFor="lead-name" className="ds-label mb-1">
                    Ваше имя <span className="text-[var(--accent)]">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                    <input
                      ref={nameRef}
                      id="lead-name"
                      type="text"
                      className="ds-input pl-8 w-full"
                      placeholder="Введите ваше имя"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      maxLength={120}
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="lead-phone" className="ds-label mb-1">
                    Телефон <span className="text-[var(--accent)]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                    <input
                      id="lead-phone"
                      type="tel"
                      className="ds-input pl-8 w-full"
                      placeholder="+7 (900) 000-00-00"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                      maxLength={30}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label htmlFor="lead-comment" className="ds-label mb-1">
                    Комментарий
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                    <textarea
                      id="lead-comment"
                      className="ds-input pl-8 w-full resize-none"
                      placeholder="Даты, количество человек, пожелания…"
                      rows={3}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      maxLength={1000}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded">
                    {error}
                  </p>
                )}

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdConsent}
                    onChange={e => setPdConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[var(--border)] accent-[var(--accent)] shrink-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Согласен(на) на{' '}
                    <a href="/legal/privacy" target="_blank" className="text-[var(--ocean)] hover:underline">
                      обработку персональных данных
                    </a>{' '}
                    (152-ФЗ)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !phone.trim()}
                  className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Отправляем…' : 'Отправить заявку'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
