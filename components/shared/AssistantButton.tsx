'use client';

/**
 * components/shared/AssistantButton.tsx
 *
 * Floating кнопка «Твой помощник» на публичных страницах.
 * Открывает чат-панель с AI. Читает профиль интересов из localStorage
 * и добавляет его в системный промпт при первом вызове.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { getInterestContext } from '@/hooks/useInterestTracker';

// ── SVG-аватар «Добрый робот» ─────────────────────────────────────────────────

function RobotAvatar() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Антенна */}
      <line x1="11" y1="0.5" x2="11" y2="4" stroke="var(--bg-card)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="11" cy="0.5" r="1.2" fill="var(--bg-card)" />
      {/* Уши */}
      <rect x="1" y="7" width="2" height="4" rx="1" fill="var(--bg-card)" opacity="0.85" />
      <rect x="19" y="7" width="2" height="4" rx="1" fill="var(--bg-card)" opacity="0.85" />
      {/* Голова */}
      <rect x="3.5" y="4" width="15" height="13" rx="3.5" fill="var(--bg-card)" />
      {/* Глаза */}
      <circle cx="8.5" cy="9.5" r="2.2" fill="var(--accent)" />
      <circle cx="13.5" cy="9.5" r="2.2" fill="var(--accent)" />
      {/* Блики в глазах */}
      <circle cx="9.2" cy="8.8" r="0.7" fill="var(--bg-card)" />
      <circle cx="14.2" cy="8.8" r="0.7" fill="var(--bg-card)" />
      {/* Улыбка */}
      <path d="M7.5 13 Q11 15.5 14.5 13" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

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

// Контекстные чипсы и приветствия
const PAGE_CHIPS: Record<string, string[]> = {
  route:    ['Что взять с собой?', 'Когда лучше ехать?', 'Кто организует тур?'],
  category: ['Помоги выбрать маршрут', 'Какой для новичка?', 'Когда сезон?'],
  map:      ['Расскажи про эту точку', 'Что рядом посмотреть?', 'Где лучшие виды?'],
  home:     QUICK_CHIPS,
};

const PAGE_GREETINGS: Record<string, string> = {
  route:    'Интересный маршрут! Могу подсказать что взять с собой или когда лучше ехать.',
  category: 'Помогу выбрать подходящий маршрут. Спрашивайте!',
  map:      'Видите точки на карте? Спросите про любую — расскажу подробнее.',
  home:     '',
};

export interface PageContext {
  type: 'route' | 'category' | 'home' | 'map' | 'place';
  title?: string;
  category?: string;
}

// ── Компонент ─────────────────────────────────────────────────────────────────

export function AssistantButton({ pageContext }: { pageContext?: PageContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interestContext, setInterestContext] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [remainingFree, setRemainingFree] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Инициализация — только на клиенте (localStorage + восстановление истории)
  useEffect(() => {
    const STORAGE_KEY = 'th_assistant_session';
    const ctx = getInterestContext();
    setInterestContext(ctx);

    // Генерируем / восстанавливаем sessionId
    let sid = localStorage.getItem(STORAGE_KEY) ?? '';
    if (!sid) {
      sid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(STORAGE_KEY, sid);
    }
    // Начинаем fetch истории ТУТ, параллельно с setSessionId (не ждём)
    fetch(`/api/ai/chat?sessionId=${encodeURIComponent(sid)}`)
      .then(r => r.json())
      .then((data: { data?: { messages?: Message[]; limitReached?: boolean; remainingFree?: number | null }; messages?: Message[] }) => {
        const prev = data.data?.messages ?? data.messages ?? [];
        if (data.data?.limitReached) setLimitReached(true);
        if (data.data?.remainingFree != null) setRemainingFree(data.data.remainingFree);
        if (prev.length > 0) {
          setMessages(prev);
        } else {
          const contextGreeting = pageContext ? PAGE_GREETINGS[pageContext.type] : '';
          const greeting = contextGreeting || buildGreeting(ctx);
          setMessages([{ role: 'assistant', content: greeting }]);
        }
      })
      .catch(() => {
        const contextGreeting = pageContext ? PAGE_GREETINGS[pageContext.type] : '';
        const greeting = contextGreeting || buildGreeting(ctx);
        setMessages([{ role: 'assistant', content: greeting }]);
      });

    // Устанавливаем sessionId (не блокирует fetch)
    setSessionId(sid);
  }, [pageContext]);

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
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId || undefined,
          role: 'tourist',
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json() as {
        success?: boolean;
        error?: string;
        data?: { answer?: string; limitReached?: boolean; authRequired?: boolean; message?: string; remainingFree?: number | null };
      };

      if (data.data?.authRequired || data.data?.limitReached) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.data?.message ?? 'Войдите или зарегистрируйтесь для общения с AI-помощником.',
        }]);
        setLimitReached(true);
        setRemainingFree(0);
        return;
      }

      if (data.data?.remainingFree != null) setRemainingFree(data.data.remainingFree);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.data?.answer ?? data.error ?? 'Что-то пошло не так, попробуй ещё раз.',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Нет связи. Проверь интернет и попробуй ещё раз.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, sessionId]);

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
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            right: '16px',
            left: 'auto',
            width: 'min(390px, calc(100vw - 32px))',
            maxHeight: '520px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <RobotAvatar />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  AI-помощник Камчатки
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  Спросите о турах и безопасности
                </p>
              </div>
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
                    color: msg.role === 'user' ? 'var(--bg-card)' : 'var(--text-primary)',
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
              {(PAGE_CHIPS[pageContext?.type ?? 'home'] ?? QUICK_CHIPS).map(chip => (
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

          {/* Input or limit CTA */}
          {limitReached ? (
            <div
              style={{
                padding: '14px 12px',
                borderTop: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginBottom: '10px',
                  lineHeight: '1.4',
                  margin: '0 0 10px',
                }}
              >
                Войдите или зарегистрируйтесь, чтобы общаться с AI-помощником.
              </p>
              <a
                href="/auth/login"
                style={{
                  display: 'inline-block',
                  padding: '8px 20px',
                  background: 'var(--accent)',
                  color: 'var(--bg-card)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                Войти или зарегистрироваться
              </a>
            </div>
          ) : (
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
                color: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
            >
              <Send size={16} />
            </button>
          </div>
          )}
          {remainingFree != null && !limitReached && remainingFree < 999 && (
            <div style={{ padding: '0 12px 6px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {remainingFree === 1 ? 'Осталось 1 сообщение' : `Осталось ${remainingFree} из 5`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Кнопка открытия ─────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Закрыть помощника' : 'Открыть помощника'}
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: '16px',
          left: 'auto',
          zIndex: 90,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isOpen ? 'var(--bg-hover)' : 'var(--accent)',
          border: isOpen ? '1.5px solid var(--border)' : 'none',
          color: isOpen ? 'var(--text-secondary)' : 'var(--bg-card)',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          transition: 'background 0.2s, color 0.2s, transform 0.15s',
        }}
        onMouseDown={e => { (e.currentTarget.style.transform = 'scale(0.92)'); }}
        onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
        onTouchStart={e => { (e.currentTarget.style.transform = 'scale(0.92)'); }}
        onTouchEnd={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
      >
        {isOpen ? <X size={20} /> : (
          <div style={{ position: 'relative' }}>
            <Sparkles size={22} className="animate-pulse" />
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              width: '10px', height: '10px',
            }}>
              <span className="animate-ping" style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%', background: 'var(--success)', opacity: 0.75,
              }} />
              <span style={{
                position: 'absolute', inset: '2px',
                borderRadius: '50%', background: 'var(--success)',
              }} />
            </span>
          </div>
        )}
      </button>
    </>
  );
}
