'use client';

import { useCallback, useRef, useState } from 'react';
import { Protected } from '@/components/Protected';
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
    <Protected roles={['operator', 'admin']}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bot className="w-6 h-6 text-sky-400" />
          <h1 className="text-2xl font-bold text-white">AI Приём заявок</h1>
          {provider && (
            <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">
              {provider}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Чат */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl flex flex-col h-[600px]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Тестовый чат</h2>
              <button onClick={startNewChat} className="text-xs text-sky-400 hover:text-sky-300 min-h-[44px] px-3">
                Новый чат
              </button>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-white/30 py-12">
                  <Bot className="w-10 h-10 mx-auto mb-3 text-white/20" />
                  <p className="text-sm">Напишите сообщение от имени туриста для тестирования AI-агента</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={`msg-${i}-${msg.role}`}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && <Bot className="w-5 h-5 text-sky-400 mt-1 shrink-0" />}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-sky-600 text-white'
                        : 'bg-white/10 text-white/90'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && <User className="w-5 h-5 text-white/40 mt-1 shrink-0" />}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-center text-white/40 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI думает...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Ввод */}
            <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Сообщение от туриста..."
                className="flex-1 min-h-[44px] px-3 py-2 bg-white/10 border border-white/15 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-sky-500 text-white disabled:opacity-50 flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Список заявок */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/50" />
              Заявки ({inquiries.length})
            </h2>

            {inquiries.length === 0 ? (
              <p className="text-white/30 text-xs">Заявки появятся после общения с AI</p>
            ) : (
              <div className="space-y-2">
                {inquiries.map(inq => (
                  <div key={inq.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-white/80 text-xs line-clamp-2 mb-2">{inq.preview}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 text-[10px]">
                        {new Date(inq.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {inq.status === 'new' ? (
                        <button
                          onClick={() => markProcessed(inq.id)}
                          className="min-h-[44px] px-2 py-1 text-xs text-green-400 hover:text-green-300 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Обработано
                        </button>
                      ) : (
                        <span className="text-xs text-green-400/60 inline-flex items-center gap-1">
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
    </Protected>
  );
}
