'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, User, Send, CheckCircle, MessageCircle, ArrowLeft, Bot, Sparkles } from 'lucide-react';

const BOT_URL = 'https://t.me/KuzmichKam_bot?start=lead';

type State = 'idle' | 'sending' | 'done' | 'error';

const STEPS = [
  { n: 1, label: 'AI анализирует ваши интересы и пожелания' },
  { n: 2, label: 'Подбирает 3 лучших тура под ваш запрос' },
  { n: 3, label: 'Менеджер перезванивает в течение часа' },
];

export default function RequestClient() {
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
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
          comment: comment.trim() || undefined,
          source_url: typeof window !== 'undefined' ? window.location.href : '/request',
          source_data: { source: 'request_page' },
        }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  const inp = 'w-full px-4 py-3 rounded-lg text-sm border outline-none transition-all focus:ring-1 focus:ring-[var(--accent)] bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]';

  return (
    <main className="flex-1 flex flex-col pt-20 pb-12 px-5">
      <div className="max-w-5xl w-full mx-auto">

        {/* Back */}
        <Link href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Главная
        </Link>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* Left — описание и шаги */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">
              Персональный подбор
            </p>
            <h1 className="font-playfair text-4xl md:text-5xl font-bold text-[var(--text-primary)] leading-tight mb-5">
              Опишите мечту —<br />
              <span className="text-[var(--accent)]">AI подберёт тур</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-8 max-w-sm">
              Кузьмич квалифицирует заявку за 15 секунд
              и пришлёт персональное предложение с 3 лучшими турами.
            </p>

            <div className="space-y-4 mb-10">
              {STEPS.map(s => (
                <div key={s.n} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0 text-sm font-bold text-[var(--accent)]">
                    {s.n}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] pt-1.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Telegram alternative */}
            <div className="flex items-start gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-[var(--ocean)]/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-[var(--ocean)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Предпочитаете чат?</p>
                <p className="text-xs text-[var(--text-muted)] mb-2">Задайте вопрос AI-оператору напрямую.</p>
                <Link href="/kuzmich"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ocean)] hover:underline">
                  <Sparkles className="w-3.5 h-3.5" /> Открыть чат с Кузьмичом
                </Link>
              </div>
            </div>
          </div>

          {/* Right — форма */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8">

            {/* Telegram — primary CTA */}
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 mb-5"
              style={{ background: '#2AABEE' }}>
              <MessageCircle className="w-5 h-5" />
              Написать Кузьмичу в Telegram
            </a>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-muted)]">или оставьте телефон</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {state === 'done' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-lg bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[var(--success)]" />
                </div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Заявка принята!</p>
                <p className="text-sm text-[var(--text-muted)]">Менеджер свяжется с вами скоро.</p>
                <Link href="/" className="inline-block mt-5 text-sm text-[var(--ocean)] hover:underline">
                  Вернуться на главную
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Ваше имя" required
                    className={inp + ' pl-10'} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+7 900 000 00 00" required
                    className={inp + ' pl-10'} />
                </div>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Кратко о мечте: рыбалка, вулканы, бюджет, даты... (необязательно)"
                  rows={3}
                  className={inp + ' resize-none'} />
                {state === 'error' && (
                  <p className="text-xs text-[var(--danger)]">Не удалось отправить. Попробуйте ещё раз.</p>
                )}
                <button type="submit" disabled={state === 'sending' || !name.trim() || !phone.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}>
                  <Send className="w-4 h-4" />
                  {state === 'sending' ? 'Отправляю...' : 'Получить предложение'}
                </button>
                <p className="text-xs text-[var(--text-muted)] text-center">
                  Нажимая кнопку, вы соглашаетесь на обработку персональных данных
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
