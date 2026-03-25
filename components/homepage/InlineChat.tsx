'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_CHIPS = [
  'Хочу 3 дня с рыбалкой и вулканами',
  'Увидеть медведей, бюджет 50 тыс',
  'Горячие источники на выходные',
  'Треккинг для новичка',
  'Что посмотреть за 5 дней?',
  'Вертолёт на Долину гейзеров',
];

export default function InlineChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storageKey = 'th_inline_session';
    let sid = '';
    try { sid = localStorage.getItem(storageKey) ?? ''; } catch { /* SSR safe */ }
    if (!sid) {
      sid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      try { localStorage.setItem(storageKey, sid); } catch { /* SSR safe */ }
    }
    setSessionId(sid);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setStarted(true);
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
    }
  }, [loading, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <section className="py-16 md:py-20 px-5 bg-[var(--bg-primary)]">
      <div className="max-w-2xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[var(--accent)]/10 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--accent)]">Кузьмич онлайн</span>
          </div>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3">
            Спросите что угодно
          </h2>
          <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-md mx-auto">
            AI-помощник знает каждый маршрут. Опишите мечту — он подберёт план.
          </p>
        </div>

        {/* Chat container */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          {started && (
            <div className="max-h-[320px] overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent)] text-white rounded-lg rounded-br-sm'
                      : 'bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex">
                  <div className="bg-[var(--bg-hover)] text-[var(--text-muted)] rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> думаю...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-center gap-3 p-4 border-t border-[var(--border)]">
            <Sparkles className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Хочу 3 дня с рыбалкой и вулканами..."
              className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-40 transition-opacity"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Quick chips (hidden after conversation starts) */}
        {!started && (
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => sendMessage(chip)}
                className="text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-full px-4 py-2 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
