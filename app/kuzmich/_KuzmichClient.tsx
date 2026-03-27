'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, Send, Loader2, ArrowLeft, Bot, ArrowRight } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHIPS = [
  'Хочу 3 дня: рыбалка + вулкан',
  'Увидеть медведей, бюджет 50 тыс',
  'Горячие источники на выходные',
  'Треккинг для новичка',
  'Что посмотреть за 5 дней?',
  'Вертолёт на Долину гейзеров',
  'Рыбалка на чавычу в июле',
  'Семейный тур с детьми',
];

export default function KuzmichClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = 'th_kuzmich_session';
    let sid = '';
    try { sid = localStorage.getItem(key) ?? ''; } catch { /* ok */ }
    if (!sid) {
      sid = crypto?.randomUUID?.() ?? `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try { localStorage.setItem(key, sid); } catch { /* ok */ }
    }
    setSessionId(sid);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), sessionId, role: 'tourist' }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.data?.answer ?? 'Попробуйте ещё раз.',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Нет связи. Попробуйте позже.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [loading, sessionId]);

  const hasMessages = messages.length > 0;

  return (
    <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 pb-6 pt-6">

      {/* Back + header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/"
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Главная
        </Link>
        <div className="flex-1" />
        <Link href="/request"
          className="flex items-center gap-1.5 text-sm text-[var(--ocean)] hover:underline">
          Оставить заявку <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Identity */}
      {!hasMessages && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)]/10 mb-4">
            <Bot className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <div className="inline-flex items-center gap-2 bg-[var(--success)]/10 rounded-full px-3 py-1 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--success)]">Кузьмич онлайн</span>
          </div>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
            Спросите что угодно
          </h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-md mx-auto">
            AI-оператор знает каждый маршрут Камчатки.
            Опишите мечту — Кузьмич подберёт план и туры.
          </p>
        </div>
      )}

      {/* Chat area */}
      <div className={`flex-1 flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden ${hasMessages ? 'min-h-[400px]' : ''}`}>

        {/* Messages */}
        {hasMessages && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent)] text-white rounded-br-sm'
                    : 'bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
                <div className="bg-[var(--bg-hover)] rounded-xl rounded-bl-sm px-4 py-3 text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> думаю...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Quick chips — only before first message */}
        {!hasMessages && (
          <div className="p-5 flex-1 flex flex-col justify-end">
            <p className="text-xs text-[var(--text-muted)] mb-3 text-center">Быстрые запросы:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {CHIPS.map(chip => (
                <button key={chip} type="button" onClick={() => send(chip)}
                  className="text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-full px-4 py-2 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-3 p-4 border-t border-[var(--border)]">
          <Sparkles className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Опишите мечту о путешествии..."
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm outline-none"
          />
          <button type="button" onClick={() => send(input)} disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-40 transition-opacity hover:opacity-90">
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Bottom hint */}
      <p className="text-center text-xs text-[var(--text-muted)] mt-4">
        Предпочитаете живое общение?{' '}
        <Link href="/request" className="text-[var(--ocean)] hover:underline">
          Оставьте заявку
        </Link>{' '}
        — менеджер перезвонит в течение часа.
      </p>
    </main>
  );
}
