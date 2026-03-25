'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PartnerConfig {
  name: string;
  greeting: string;
  accentColor: string;
  logo: string | null;
}

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.host}`
  : '';

export default function WidgetPage() {
  const params = useParams();
  const partnerId = params.partnerId as string;

  const [config, setConfig] = useState<PartnerConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Load partner config
  useEffect(() => {
    if (!partnerId) return;
    fetch(`${API_BASE}/api/widget/partner/${partnerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setConfig(data.data);
          setMessages([{ role: 'assistant', content: data.data.greeting }]);
        } else {
          setError('Partner not found');
        }
      })
      .catch(() => setError('Failed to load widget'));
  }, [partnerId]);

  // Auto-scroll
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !config) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/widget/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId,
          sessionId,
          message: text,
          history: messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0),
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Извините, попробуйте ещё раз.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка соединения. Попробуйте позже.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#6B6560' }}>
        {error}
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#6B6560' }}>
        Загрузка...
      </div>
    );
  }

  const accent = config.accentColor || '#D44A0C';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: "'Outfit', system-ui, sans-serif",
      background: '#F5F0EB',
      color: '#1A1714',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        {config.logo && (
          <img
            src={config.logo}
            alt={config.name}
            style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
          />
        )}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>
            {config.name}
          </div>
          <div style={{ fontSize: 11, color: '#6B6560' }}>
            AI-помощник TourHub
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? accent : '#FFFFFF',
              color: msg.role === 'user' ? '#FFFFFF' : '#1A1714',
              fontSize: 14,
              lineHeight: 1.5,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '16px 16px 16px 4px',
              background: '#FFFFFF',
              fontSize: 14,
              color: '#9A9590',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              Печатает...
            </div>
          </div>
        )}

        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        background: '#FFFFFF',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Напишите сообщение..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: 20,
            outline: 'none',
            fontSize: 14,
            fontFamily: 'inherit',
            background: '#F5F0EB',
          }}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: 'none',
            background: input.trim() ? accent : '#E0DBD5',
            color: '#FFFFFF',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          <Send size={16} />
        </button>
      </div>

      {/* Powered by */}
      <div style={{
        textAlign: 'center',
        padding: '6px',
        fontSize: 10,
        color: '#9A9590',
        background: '#FFFFFF',
        borderTop: '1px solid rgba(0,0,0,0.04)',
      }}>
        Powered by <a href="https://tourhab.ru" target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: 'none' }}>TourHub</a>
      </div>
    </div>
  );
}
