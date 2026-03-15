'use client';

/**
 * components/shared/AssistantButton.tsx
 *
 * Floating кнопка «Твой помощник» на публичных страницах.
 * Открывает чат-панель с AI. Читает профиль интересов из localStorage
 * и добавляет его в системный промпт при первом вызове.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { getInterestContext } from '@/hooks/useInterestTracker';

// ── Типы ──────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Приветствие ────────────────────────────────────────────────────────────────

function buildGreeting(ctx: string): string {
  if (!ctx) {
    return 'Привет! Планируешь Камчатку? Помогу выбрать маршрут, оператора или отвечу на любой вопрос.';
  }
  // ctx = "Турист просматривал: рыбалка, вулканы."
  const match = ctx.match(/просматривал:\s*([^.]+)/);
  const first = match?.[1]?.split(',')[0]?.trim();
  if (first) {
    return `Привет! Вижу, интересует ${first} — рассказать подробнее или помочь выбрать маршрут?`;
  }
  return 'Привет! Что планируешь на Камчатке? Помогу разобраться.';
}

// ── Чипсы быстрых вопросов ────────────────────────────────────────────────────

const QUICK_CHIPS = [
  'Вулканы для новичка',
  'Где порыбачить?',
  'Что взять в поход?',
];

// ── Компонент ─────────────────────────────────────────────────────────────────

export function AssistantButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interestContext, setInterestContext] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Инициализация — только на клиенте (localStorage)
  useEffect(() => {
    const ctx = getInterestContext();
    setInterestContext(ctx);
    setMessages([{ role: 'assistant', content: buildGreeting(ctx) }]);
  }, []);

  // Автоскролл при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Фокус на инпут при открытии
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // ── Отправка сообщения ───────────────────────────────────────────────────

  const sendText = useCallback(async (text: string) => {
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages: Message[] = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.slice(-12),
          interestContext: interestContext || undefined,
        }),
      });

      const data = await res.json() as { reply?: string; error?: string };
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? (data.error ?? 'Что-то пошло не так, попробуй ещё раз.'),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Нет связи. Проверь интернет и попробуй ещё раз.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, interestContext]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendText(text);
  }, [input, sendText]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Чат-панель ──────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '136px',
            right: '16px',
            width: '320px',
            maxHeight: '450px',
            zIndex: 89,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          }}
        >
          {/* Шапка */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                Твой помощник
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                Туры на Камчатку
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Сообщения */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: msg.role === 'user'
                      ? '12px 12px 2px 12px'
                      : '12px 12px 12px 2px',
                    background: msg.role === 'user'
                      ? 'var(--accent)'
                      : 'var(--bg-hover)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px 12px 12px 2px',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                  }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  думаю...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Быстрые вопросы — показываем только в начале */}
          {messages.length === 1 && !loading && (
            <div
              style={{
                padding: '0 12px 10px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                flexShrink: 0,
              }}
            >
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => sendText(chip)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '100px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget.style.borderColor = 'var(--accent)');
                    (e.currentTarget.style.color = 'var(--accent)');
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget.style.borderColor = 'var(--border)');
                    (e.currentTarget.style.color = 'var(--text-secondary)');
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Инпут */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Спроси что угодно..."
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.4',
                maxHeight: '80px',
                overflowY: 'auto',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Отправить"
              style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                opacity: input.trim() && !loading ? 1 : 0.45,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Кнопка открытия ─────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Закрыть помощника' : 'Открыть помощника'}
        style={{
          position: 'fixed',
          bottom: '76px',
          right: '16px',
          zIndex: 90,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isOpen ? 'var(--bg-hover)' : 'var(--accent)',
          border: isOpen ? '1.5px solid var(--border)' : 'none',
          color: isOpen ? 'var(--text-secondary)' : '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          transition: 'background 0.2s, color 0.2s, transform 0.15s',
        }}
        onMouseDown={e => { (e.currentTarget.style.transform = 'scale(0.92)'); }}
        onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
        onTouchStart={e => { (e.currentTarget.style.transform = 'scale(0.92)'); }}
        onTouchEnd={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
