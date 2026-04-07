'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, X, User, Phone, Sparkles, Send, CheckCircle, MessageCircle } from 'lucide-react';
import { trackLeadEvent, LEAD_EVENTS } from '@/lib/analytics/lead-tracking';

type State = 'idle' | 'form' | 'sending' | 'done' | 'error';

/**
 * Глобальная sticky-кнопка "Хочу тур" — видна на всех страницах.
 * Открывает компактную форму лида прямо в попапе.
 * Скрывается на страницах /hub/* (внутренние дашборды).
 */
export default function StickyLeadButton() {
  const pathname = usePathname();
  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [comment, setComment] = useState('');
  const [state, setState]     = useState<State>('form');

  // Отслеживаем открытие формы
  useEffect(() => {
    if (open) {
      trackLeadEvent({ ...LEAD_EVENTS.OPEN_LEAD_FORM_PHONE, source: 'sticky_button' });
    }
  }, [open]);

  // Не показываем в хабах и на главной, где уже есть основной сценарий коммуникации
  if (pathname?.startsWith('/hub') || pathname === '/') return null;

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    trackLeadEvent({ ...LEAD_EVENTS.SUBMIT_LEAD, source: 'sticky_button' });
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Turист',
          phone: phone.trim(),
          comment: comment.trim() || undefined,
          source_url: typeof window !== 'undefined' ? window.location.href : '/',
          source_data: { source: 'sticky_cta' },
        }),
      });
      if (res.ok) {
        trackLeadEvent({ ...LEAD_EVENTS.LEAD_SUCCESS, source: 'sticky_button' });
        setState('done');
      } else {
        trackLeadEvent({ ...LEAD_EVENTS.LEAD_ERROR, source: 'sticky_button' });
        setState('error');
      }
    } catch {
      trackLeadEvent({ ...LEAD_EVENTS.LEAD_ERROR, source: 'sticky_button' });
      setState('error');
    }
  }

  function reset() {
    setOpen(false);
    setTimeout(() => { setName(''); setPhone(''); setComment(''); setState('form'); }, 300);
  }

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(212, 74, 12, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(212, 74, 12, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 74, 12, 0); }
        }
        .lead-button-pulse {
          animation: pulse-ring 2s infinite;
        }
      `}</style>

      {/* Popover form */}
      {open && (
        <div
          className="fixed bottom-24 right-4 z-50 w-80 rounded-xl shadow-2xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Подобрать тур на Камчатку
            </p>
            <button onClick={reset} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {state === 'done' ? (
              <div className="flex flex-col items-center py-4 gap-3 text-center">
                <CheckCircle className="w-10 h-10" style={{ color: 'var(--success)' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Заявка принята!</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Менеджер перезвонит скоро.</p>
                <button onClick={reset} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Закрыть</button>
              </div>
            ) : (
              <>
                {/* Мессенджеры */}
                <div className="flex gap-2 mb-3">
                  <a
                    href="https://t.me/KuzmichKam_bot?start=lead"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#2AABEE' }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Telegram
                  </a>
                  <a
                    href="https://max.ru/id4101147649_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#7C3AED' }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> MAX
                  </a>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>или оставьте телефон</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>

                <form onSubmit={submitLead} className="space-y-2.5">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+7 900 000 00 00" autoFocus required
                    className="ds-input w-full pl-8 pr-3 py-2 text-sm"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Ваше имя (необязательно)"
                    className="ds-input w-full pl-8 pr-3 py-2 text-sm"
                  />
                </div>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-3 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <textarea
                    value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Что хотите? Вулканы, рыбалка, даты..."
                    rows={2}
                    className="ds-input w-full pl-8 pr-3 py-2 text-sm resize-none"
                  />
                </div>
                {state === 'error' && (
                  <p className="text-xs" style={{ color: 'var(--danger)' }}>Ошибка. Попробуйте ещё раз.</p>
                )}
                <button
                  type="submit"
                  disabled={state === 'sending' || !phone.trim()}
                  className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {state === 'sending' ? 'Отправляю...' : 'Оставить заявку'}
                </button>
                <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Обработка персональных данных
                </p>
              </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => {
          setOpen(v => !v);
          if (!open) {
            trackLeadEvent({ ...LEAD_EVENTS.CLICK_LEAD_BUTTON, source: 'sticky_button' });
          }
        }}
        className={`fixed bottom-4 right-4 z-50 flex items-center justify-center gap-2 px-5 py-4 rounded-full shadow-2xl text-sm font-bold text-white transition-all hover:scale-110 active:scale-95 ${!open ? 'lead-button-pulse' : ''}`}
        style={{ background: 'var(--accent)' }}
        aria-label="Оставить заявку на тур"
      >
        <MessageSquarePlus className="w-5 h-5" />
        <span className="hidden sm:inline">Хочу тур</span>
      </button>
    </>
  );
}
