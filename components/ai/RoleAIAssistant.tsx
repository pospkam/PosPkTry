'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getRoleSystemPrompt, getRoleWelcomeMessage, getRoleQuickQuestions, RoleContext } from '@/lib/ai/role-prompts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RoleAIAssistantProps {
  roleContext: RoleContext;
  className?: string;
  compact?: boolean;
}

export function RoleAIAssistant({ roleContext, className = '', compact = false }: RoleAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Инициализация с приветственным сообщением
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content: getRoleWelcomeMessage(roleContext),
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [roleContext]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: getRoleSystemPrompt(roleContext)
            },
            ...messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            {
              role: 'user',
              content: text
            }
          ],
          context: roleContext
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.data.response || result.data.message || 'Извините, не смог сформировать ответ.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(result.error || 'Ошибка AI');
      }
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '[] Извините, произошла ошибка. Попробуйте ещё раз.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const clearChat = () => {
    const welcomeMessage: Message = {
      role: 'assistant',
      content: getRoleWelcomeMessage(roleContext),
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const quickQuestions = getRoleQuickQuestions(roleContext.role);

  // Компактный вид (кнопка в углу)
  if (compact) {
    return (
      <>
        {/* Кнопка открытия */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-premium-gold hover:bg-premium-gold/80 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all z-50"
          aria-label="AI Помощник"
        >
          {isOpen ? '' : ''}
        </button>

        {/* Чат окно */}
        {isOpen && (
          <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-premium-black border-2 border-premium-gold rounded-3xl shadow-2xl flex flex-col z-40 overflow-hidden">
            {/* Заголовок */}
            <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl"></span>
                  <div>
                    <h3 className="text-white font-semibold">AI Помощник</h3>
                    <p className="text-xs text-white/50">Всегда готов помочь</p>
                  </div>
                </div>
                <button
                  onClick={clearChat}
                  className="text-white/50 hover:text-white text-sm"
                  title="Очистить чат"
                >
                   
                </button>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-premium-gold text-premium-black'
                        : 'bg-white/5 text-white border border-white/10'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Быстрые вопросы */}
            {messages.length === 1 && quickQuestions.length > 0 && (
              <div className="px-4 pb-2 space-y-2">
                <p className="text-xs text-white/50">Быстрые вопросы:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.slice(0, 3).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-full border border-white/10 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ввод */}
            <div className="p-4 border-t border-white/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ваш вопрос..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-premium-gold text-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  
                </button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Полный вид (встроенный в страницу)
  return (
    <div className={`bg-white/5 border border-white/10 rounded-3xl flex flex-col ${className}`}>
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl"></span>
            <div>
              <h3 className="text-white font-semibold">AI Помощник</h3>
              <p className="text-xs text-white/50">Умный ассистент для вашей работы</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="text-white/50 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            Очистить
          </button>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[400px] max-h-[600px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                message.role === 'user'
                  ? 'bg-premium-gold text-premium-black'
                  : 'bg-white/10 text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-50 mt-2">
                {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Быстрые вопросы */}
      {messages.length === 1 && quickQuestions.length > 0 && (
        <div className="px-6 pb-4 space-y-3">
          <p className="text-sm text-white/50">  Популярные вопросы:</p>
          <div className="grid grid-cols-1 gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="text-left text-sm px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 hover:border-premium-gold/30 transition-all"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ввод */}
      <div className="p-6 border-t border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задайте ваш вопрос..."
            className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? ' ' : 'Отправить'}
          </button>
        </form>
      </div>
    </div>
  );
}

