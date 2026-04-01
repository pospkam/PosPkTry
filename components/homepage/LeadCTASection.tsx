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
    <section id="lead" className="py-20 px-5" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1A1714 0%, #2C1810 60%, #1A0F0A 100%)' }}
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left — copy */}
            <div className="p-10 md:p-14 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--accent)' }}>
                Персональный подбор
              </p>
              <h2
                className="font-playfair font-bold text-white leading-tight mb-5"
                style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)' }}
              >
                Опишите мечту —<br />
                <span style={{ color: 'var(--accent)' }}>AI подберёт тур</span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Кузьмич квалифицирует заявку за 15 секунд
                и пришлёт персональное предложение.
              </p>

              <div className="mt-8 space-y-2.5">
                {['AI анализирует ваши интересы', 'Подбирает 3 лучших тура', 'Менеджер перезванивает в течение часа'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-white/70">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      {i + 1}
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — form */}
            <div className="p-10 md:p-14 flex flex-col justify-center gap-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {/* Telegram — primary */}
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 py-4 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: '#2AABEE' }}
              >
                <MessageCircle className="w-5 h-5" />
                Написать Кузьмичу в Telegram
              </a>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <span className="text-xs text-white/30">или оставьте телефон</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
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
                  <p className="text-white/50 text-sm">Менеджер свяжется с вами скоро.</p>
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
                      className="w-full pl-9 pr-4 py-3 rounded-lg text-sm text-white placeholder-white/30 border outline-none focus:ring-1 transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
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
                      className="w-full pl-9 pr-4 py-3 rounded-lg text-sm text-white placeholder-white/30 border outline-none focus:ring-1 transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
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
