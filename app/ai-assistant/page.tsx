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

    setMessages(prev => [...prev, { role: 'user', content: text }]);
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
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-8rem)] bg-[#0D1117] min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-8 h-8 text-[var(--ocean,#00A8CC)]" />
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#F0F6FC]">AI Помощник</h1>
          <p className="text-sm text-[#8B949E]">Спросите о турах, погоде, безопасности на Камчатке</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-[#484F58]">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="mb-4">Задайте вопрос о Камчатке</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Какие вулканы посетить?', 'Лучшее время для рыбалки', 'Что взять в поход?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-[#8B949E] text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors min-h-[44px]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <Bot className="w-5 h-5 text-[var(--ocean,#00A8CC)] mt-1 shrink-0" />}
            <div className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-[var(--accent)]/20 text-[#F0F6FC] rounded-2xl rounded-br-sm'
                : 'bg-[#21262D] text-[#F0F6FC] rounded-2xl rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && <User className="w-5 h-5 text-[#484F58] mt-1 shrink-0" />}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[#484F58] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Думаю...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-[#161B22] border-t border-[rgba(255,255,255,0.08)] -mx-4 px-4 py-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Спросите о Камчатке..."
            disabled={loading}
            className="flex-1 min-h-[44px] px-4 bg-[#21262D] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#F0F6FC] placeholder-[#484F58] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="min-h-[44px] min-w-[44px] px-4 bg-[var(--accent)] text-white rounded-xl disabled:opacity-50 flex items-center justify-center hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
