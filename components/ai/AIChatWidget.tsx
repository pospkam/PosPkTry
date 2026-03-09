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
  userId?: string;
}

const SESSION_STORAGE_KEY = 'kamhub_ai_session_id';

const CREW_KEYWORDS = ['вулкан','маршрут','тур','рыбалк','поход','термы','гейзер','планир','поездк','путешеств'];
const CREW_STEPS = ['Анализирую запрос...', 'Ищу маршруты...', 'Составляю план...', 'Проверяю план...', 'Форматирую...'];

function isTourPlanningQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return text.trim().length > 15 && CREW_KEYWORDS.some(kw => lower.includes(kw));
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AIChatWidget({ isOpen = false, onClose, className, userId }: AIChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCrewMode, setIsCrewMode] = useState(false);
  const [crewStepIdx, setCrewStepIdx] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const crewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // Cleanup crew interval on unmount
  useEffect(() => {
    return () => {
      if (crewIntervalRef.current) clearInterval(crewIntervalRef.current);
    };
  }, []);

  const callAI = async (text: string) => {
    if (!text || isLoading) return;

    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), text, role: 'user', timestamp: new Date() },
    ]);
    setIsLoading(true);

    const crewMode = isTourPlanningQuery(text);
    setIsCrewMode(crewMode);

    if (crewMode) {
      // Crew pipeline — 5-агентный пайплайн планирования
      setCrewStepIdx(0);
      crewIntervalRef.current = setInterval(() => {
        setCrewStepIdx(prev => Math.min(prev + 1, CREW_STEPS.length - 1));
      }, 4000);

      try {
        const response = await fetch('/api/ai/crew-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, groupSize: 1, durationDays: 3 }),
        });

        if (crewIntervalRef.current) { clearInterval(crewIntervalRef.current); crewIntervalRef.current = null; }

        if (!response.ok) throw new Error(`crew-plan error: ${response.status}`);

        const payload: unknown = await response.json();
        let aiText = 'Не удалось получить ответ агентов. Попробуйте снова.';

        if (payload && typeof payload === 'object') {
          const obj = payload as Record<string, unknown>;
          if (obj.success && obj.data && typeof obj.data === 'object') {
            const data = obj.data as Record<string, unknown>;
            if (typeof data.formatted === 'string' && data.formatted.trim()) {
              aiText = data.formatted;
            }
          }
        }

        setMessages(prev => [
          ...prev,
          { id: (Date.now() + 1).toString(), text: aiText, role: 'ai', timestamp: new Date() },
        ]);
      } catch {
        if (crewIntervalRef.current) { clearInterval(crewIntervalRef.current); crewIntervalRef.current = null; }
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: 'Сервис планирования временно недоступен. Попробуйте снова через минуту.',
            role: 'ai',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsCrewMode(false);
      }
    } else {
      // Обычный AI-чат
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            sessionId: sessionId || createSessionId(),
            role: 'tourist',
            userId: userId ?? null,
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

        setMessages(prev => [
          ...prev,
          { id: (Date.now() + 1).toString(), text: aiText, role: 'ai', timestamp: new Date() },
        ]);
      } catch {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: 'Сервис временно недоступен. Попробуйте снова через минуту.',
            role: 'ai',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    setInput('');
    await callAI(trimmedInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const sendQuickMessage = (text: string) => {
    setInput('');
    callAI(text);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed bottom-44 left-4 right-4 max-h-[65vh] sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 sm:h-[520px] sm:max-h-none flex flex-col overflow-hidden glassmorphism shadow-2xl z-50 ${className || ''}`}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 500 }}
          role="dialog"
          aria-modal="true"
          aria-label="AI-чат помощник Камчатки"
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/20 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <Bot size={24} className="text-ocean" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-white">AI-помощник Камчатки</h3>
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

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4" aria-live="polite">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs p-3 rounded-2xl ${
                    msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/90'
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
                <div className="bg-slate-800/60 px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span className="text-sm text-white/50">
                      {isCrewMode ? 'Агенты думают...' : 'AI думает...'}
                    </span>
                  </div>
                  {isCrewMode && (
                    <>
                      <div className="flex gap-1 mt-2">
                        {CREW_STEPS.map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= crewStepIdx ? 'bg-premium-gold' : 'bg-white/20'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/50 mt-1 block">{CREW_STEPS[crewStepIdx]}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 border-t border-white/20 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Спросите о Камчатке..."
                className="flex-1 px-4 py-3 rounded-full bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-premium-gold placeholder:text-white/40 text-white text-sm"
                aria-label="Сообщение для AI"
                disabled={isLoading}
                autoFocus
              />
              <motion.button
                className="p-3 bg-premium-gold text-premium-black rounded-full disabled:opacity-50"
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
                className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px] disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                aria-label="Планировать тур"
                type="button"
                disabled={isLoading}
                onClick={() => sendQuickMessage('Помоги спланировать тур на Камчатку: даты, бюджет, интересы')}
              >
                <Calendar size={14} aria-hidden="true" /> Планировать тур
              </motion.button>
              <motion.button
                className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px] disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                aria-label="Погода"
                type="button"
                disabled={isLoading}
                onClick={() => sendQuickMessage('Какая погода на Камчатке? Когда лучший сезон для поездки?')}
              >
                <Thermometer size={14} aria-hidden="true" /> Погода
              </motion.button>
              <motion.button
                className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px] disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                aria-label="Безопасность"
                type="button"
                disabled={isLoading}
                onClick={() => sendQuickMessage('Расскажи о безопасности на Камчатке: медведи, вулканы, снаряжение')}
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
