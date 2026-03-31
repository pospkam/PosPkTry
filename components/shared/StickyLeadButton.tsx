'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, X, User, Phone, Sparkles, Send, CheckCircle } from 'lucide-react';

type State = 'idle' | 'sending' | 'done' | 'error';

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
  const [state, setState]     = useState<State>('idle');

  // Не показываем в хабах (дашборды операторов, админов и т.д.)
  if (pathname?.startsWith('/hub')) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim() || undefined,
          source_url: typeof window !== 'undefined' ? window.location.href : '/',
          source_data: { source: 'sticky_cta' },
        }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  function reset() {
    setOpen(false);
    setTimeout(() => { setName(''); setPhone(''); setComment(''); setState('idle'); }, 300);
  }

  return (
    <>
      {/* Popover form */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 w-80 rounded-xl shadow-2xl border overflow-hidden"
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
              <form onSubmit={submit} className="space-y-2.5">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Ваше имя" required
                    className="ds-input w-full pl-8 pr-3 py-2 text-sm"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+7 900 000 00 00" required
                    className="ds-input w-full pl-8 pr-3 py-2 text-sm"
                  />
                </div>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-3 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <textarea
                    value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Что хотите? Вулканы, рыбалка, даты, группа..."
                    rows={2}
                    className="ds-input w-full pl-8 pr-3 py-2 text-sm resize-none"
                  />
                </div>
                {state === 'error' && (
                  <p className="text-xs" style={{ color: 'var(--danger)' }}>Ошибка. Попробуйте ещё раз.</p>
                )}
                <button
                  type="submit"
                  disabled={state === 'sending' || !name.trim() || !phone.trim()}
                  className="ds-btn ds-btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {state === 'sending' ? 'Отправляю...' : 'Оставить заявку'}
                </button>
                <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Обработка персональных данных
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
        style={{ background: 'var(--accent)' }}
        aria-label="Оставить заявку на тур"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Хочу тур</span>
      </button>
    </>
  );
}
