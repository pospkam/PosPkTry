'use client';

import { useState } from 'react';
import { Phone, User, Send, CheckCircle, MessageCircle } from 'lucide-react';

const BOT_URL = 'https://t.me/KuzmichKam_bot?start=lead';

type State = 'idle' | 'sending' | 'done' | 'error';

export function LeadCTASection() {
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<State>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setState('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          source_url: typeof window !== 'undefined' ? window.location.href : '/',
          source_data: { source: 'homepage_cta' },
        }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <section id="lead" className="py-14 px-5" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <div
          className="rounded-lg overflow-hidden border border-[var(--border)]"
          style={{ background: 'var(--bg-card)' }}
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left — copy */}
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--accent)' }}>
                Запрос менеджеру
              </p>
              <h2
                className="font-playfair font-bold text-[var(--text-primary)] leading-tight mb-4"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}
              >
                Нужен звонок менеджера
                <br />
                <span style={{ color: 'var(--accent)' }}>по вашему маршруту</span>
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-sm">
                Оставьте контакт и краткий запрос. Команда подберёт туры и свяжется в рабочее время.
              </p>
            </div>

            {/* Right — form */}
            <div className="p-8 md:p-10 flex flex-col justify-center gap-4" style={{ background: 'var(--bg-primary)' }}>
              {/* Telegram — primary */}
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 py-3 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: '#2AABEE' }}
              >
                <MessageCircle className="w-5 h-5" />
                Telegram
              </a>

              {/* MAX — secondary */}
              <a
                href="https://max.ru/id4101147649_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 py-3 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: '#7C3AED' }}
              >
                <MessageCircle className="w-5 h-5" />
                MAX
              </a>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs text-[var(--text-muted)]">или телефон</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              {state === 'done' ? (
                <div className="text-center py-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'color-mix(in srgb, var(--success) 20%, transparent)' }}
                  >
                    <CheckCircle className="w-7 h-7" style={{ color: 'var(--success)' }} />
                  </div>
                  <p className="text-white font-semibold mb-1">Заявка принята!</p>
                  <p className="text-[var(--text-secondary)] text-sm">Менеджер свяжется с вами скоро.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ваше имя"
                      required
                      className="w-full pl-9 pr-4 py-3 rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] border outline-none focus:ring-1 transition-all"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+7 900 000 00 00"
                      required
                      className="w-full pl-9 pr-4 py-3 rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] border outline-none focus:ring-1 transition-all"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    />
                  </div>
                  {state === 'error' && (
                    <p className="text-xs" style={{ color: 'var(--danger)' }}>
                      Не удалось отправить. Попробуйте ещё раз.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={state === 'sending' || !name.trim() || !phone.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Send className="w-4 h-4" />
                    {state === 'sending' ? 'Отправляю...' : 'Получить предложение'}
                  </button>
                  <p className="text-xs text-white/30 text-center">
                    Нажимая кнопку, вы соглашаетесь на обработку персональных данных
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
