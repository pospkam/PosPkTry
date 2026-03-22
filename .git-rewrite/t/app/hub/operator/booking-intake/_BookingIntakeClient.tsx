'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Bot, Send, Loader2, CheckCircle2, Clock, User,
} from 'lucide-react';

// -- Типы --

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Inquiry {
  id: string;
  preview: string;
  status: 'new' | 'processed';
  createdAt: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export default function BookingIntakeClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch('/api/ai/booking-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      const data: unknown = await res.json();
      if (isRecord(data) && data.success && isRecord(data.data)) {
        const reply = typeof data.data.reply === 'string' ? data.data.reply : 'Нет ответа';
        const prov = typeof data.data.provider === 'string' ? data.data.provider : null;
        setProvider(prov);
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

        // Добавляем заявку в список при первом сообщении пользователя
        if (messages.length === 0) {
          const newInquiry: Inquiry = {
            id: crypto.randomUUID(),
            preview: text.slice(0, 80),
            status: 'new',
            createdAt: new Date().toISOString(),
          };
          setInquiries(prev => [newInquiry, ...prev]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка получения ответа.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Сервер недоступен. Попробуйте позже.' }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function markProcessed(id: string) {
    setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: 'processed' as const } : inq));
  }

  function startNewChat() {
    setMessages([]);
    setProvider(null);
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bot className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Приём заявок</h1>
        {provider && (
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border)]">
            {provider}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Чат */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg flex flex-col h-[600px]">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Тестовый чат</h2>
            <button
              onClick={startNewChat}
              className="text-xs text-[var(--accent)] hover:opacity-80 min-h-[44px] px-3 transition-opacity"
            >
              Новый чат
            </button>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-[var(--text-muted)] py-12">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Напишите сообщение от имени туриста для тестирования AI-агента</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={`msg-${i}-${msg.role}`}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && <Bot className="w-5 h-5 text-[var(--accent)] mt-1 shrink-0" />}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && <User className="w-5 h-5 text-[var(--text-muted)] mt-1 shrink-0" />}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-[var(--text-muted)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI думает...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Ввод */}
          <form onSubmit={sendMessage} className="p-4 border-t border-[var(--border)] flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Сообщение от туриста..."
              className="flex-1 min-h-[44px] px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="min-h-[44px] min-w-[44px] px-3 rounded-md bg-[var(--accent)] text-[var(--bg-card)] disabled:opacity-50 flex items-center justify-center transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Список заявок */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
            Заявки ({inquiries.length})
          </h2>

          {inquiries.length === 0 ? (
            <p className="text-[var(--text-muted)] text-xs">Заявки появятся после общения с AI</p>
          ) : (
            <div className="space-y-2">
              {inquiries.map(inq => (
                <div key={inq.id} className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-md p-3">
                  <p className="text-[var(--text-secondary)] text-xs line-clamp-2 mb-2">{inq.preview}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)] text-[10px]">
                      {new Date(inq.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {inq.status === 'new' ? (
                      <button
                        onClick={() => markProcessed(inq.id)}
                        className="min-h-[44px] px-2 py-1 text-xs text-[var(--success)] hover:opacity-80 inline-flex items-center gap-1 transition-opacity"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Обработано
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--success)]/60 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Готово
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
