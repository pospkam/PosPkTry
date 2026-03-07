'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Calendar, Thermometer, ShieldCheck, Send, Loader2 } from 'lucide-react';

type Message = {
  id: string;
  text: string;
  role: 'user' | 'ai';
  timestamp?: Date;
};

interface AIChatWidgetProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const SESSION_STORAGE_KEY = 'kamhub_ai_session_id';

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AIChatWidget({ isOpen = false, onClose, className }: AIChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Инициализируем id сессии и сохраняем в localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      setSessionId(saved);
      return;
    }
    const nextId = createSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextId);
    setSessionId(nextId);
  }, []);

  // Приветствие при открытии
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          text: 'Привет! Я помогу подобрать тур по Камчатке. Напишите даты, бюджет, количество человек и интересы.',
          role: 'ai',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  // Автофокус при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedInput,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          sessionId: sessionId || createSessionId(),
          role: 'tourist',
        }),
      });

      if (!response.ok) {
        throw new Error(`AI endpoint error: ${response.status}`);
      }

      const payload: unknown = await response.json();
      let aiText = 'Не удалось получить ответ. Попробуйте снова.';

      if (payload && typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        if (typeof obj.answer === 'string' && obj.answer.trim()) {
          aiText = obj.answer;
        } else if (
          obj.data &&
          typeof obj.data === 'object' &&
          typeof (obj.data as Record<string, unknown>).answer === 'string'
        ) {
          aiText = (obj.data as Record<string, unknown>).answer as string;
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        role: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Сервис временно недоступен. Попробуйте снова через минуту.',
        role: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed bottom-6 right-6 w-96 h-[520px] glassmorphism shadow-2xl z-50 ${className || ''}`}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 500 }}
          role="dialog"
          aria-modal="true"
          aria-label="AI-чат помощник Камчатки"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/20 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <Bot size={24} className="text-ocean" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">AI-помощник Камчатки</h3>
                <p className="text-sm text-volcano">Спросите о турах и безопасности</p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Закрыть чат"
            >
              <X size={20} aria-hidden="true" />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4" aria-live="polite">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs p-3 rounded-2xl ${
                    msg.role === 'user' ? 'bg-ocean text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                  aria-label={msg.role === 'user' ? 'Ваше сообщение' : 'Ответ AI'}
                >
                  {msg.text}
                  {msg.timestamp && (
                    <div className="text-xs opacity-60 mt-1 text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/60 px-4 py-3 rounded-2xl flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-sm text-gray-400">AI думает...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-6 border-t border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Спросите о Камчатке..."
                className="flex-1 px-4 py-3 rounded-full bg-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-ocean placeholder-volcano text-sm"
                aria-label="Сообщение для AI"
                disabled={isLoading}
                autoFocus
              />
              <motion.button
                className="p-3 bg-ocean text-white rounded-full disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                aria-label="Отправить сообщение"
                type="submit"
                disabled={isLoading || !input.trim()}
              >
                <Send size={18} aria-hidden="true" />
              </motion.button>
            </div>
            <div className="flex gap-2">
              <motion.button
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-ocean hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px]"
                whileHover={{ scale: 1.05 }}
                aria-label="Планировать тур"
                type="button"
              >
                <Calendar size={14} aria-hidden="true" /> Планировать тур
              </motion.button>
              <motion.button
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-ocean hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px]"
                whileHover={{ scale: 1.05 }}
                aria-label="Погода"
                type="button"
              >
                <Thermometer size={14} aria-hidden="true" /> Погода
              </motion.button>
              <motion.button
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-ocean hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px]"
                whileHover={{ scale: 1.05 }}
                aria-label="Безопасность"
                type="button"
              >
                <ShieldCheck size={14} aria-hidden="true" /> Безопасность
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
