'use client';

import { useState, useRef } from 'react';
import { Bot, Send, Loader2, User } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data: unknown = await res.json();

      let reply = 'Извините, не удалось получить ответ. Попробуйте позже.';
      if (isRecord(data) && data.success && isRecord(data.data)) {
        const msg = data.data.message ?? data.data.reply;
        if (typeof msg === 'string') reply = msg;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Сервер недоступен. При опасности звоните 112 (МЧС).',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-8 h-8 text-[var(--accent)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Помощник</h1>
          <p className="text-sm text-[var(--text-secondary)]">Спросите о турах, погоде, безопасности на Камчатке</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Задайте вопрос о Камчатке</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <Bot className="w-5 h-5 text-[var(--accent)] mt-1 shrink-0" />}
            <div className={`max-w-[80%] px-4 py-3 rounded-[var(--radius-lg)] text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && <User className="w-5 h-5 text-[var(--text-muted)] mt-1 shrink-0" />}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Думаю...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Спросите о Камчатке..."
          disabled={loading}
          className="flex-1 min-h-[44px] px-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-[44px] min-w-[44px] px-4 bg-[var(--accent)] text-white rounded-[var(--radius-md)] disabled:opacity-50 flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
