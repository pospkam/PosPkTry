'use client';

import React, { useState, useRef, useEffect } from 'react';
import { callRoleAssistant, ROLE_QUICK_COMMANDS, type RoleType, type AssistantMessage } from '@/lib/ai/role-assistants';

interface RoleAssistantWidgetProps {
  role: RoleType;
  userId?: string;
}

export function RoleAssistantWidget({ role, userId }: RoleAssistantWidgetProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roleNames: Record<RoleType, string> = {
    tourist: 'Помощник Туриста',
    operator: 'Помощник Оператора',
    agent: 'Помощник Агента',
    guide: 'Помощник Гида',
    transfer: 'Помощник Трансфер-Оператора',
    admin: 'Помощник Администратора'
  };

  const roleIcons: Record<RoleType, string> = {
    tourist: '🏔️',
    operator: '💼',
    agent: '👨‍💼',
    guide: '🧗',
    transfer: '🚗',
    admin: '👑'
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (message?: string) => {
    const textToSend = message || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: AssistantMessage = {
      role: 'user',
      content: textToSend
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await callRoleAssistant(
        role,
        textToSend,
        { role, userId },
        messages
      );

      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Assistant error:', error);
      const errorMessage: AssistantMessage = {
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCommand = (command: string) => {
    handleSend(command);
  };

  const quickCommands = ROLE_QUICK_COMMANDS[role] || [];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-premium-gold to-yellow-500 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center text-3xl z-50"
        title={roleNames[role]}
      >
        {roleIcons[role]}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-premium-black/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{roleIcons[role]}</span>
          <div>
            <h3 className="text-white font-bold">{roleNames[role]}</h3>
            <p className="text-xs text-white/50">AI Ассистент</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-white/70 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/70 mb-6">Привет! Я ваш AI-помощник. Чем могу помочь?</p>
            
            {/* Quick Commands */}
            <div className="space-y-2">
              <p className="text-xs text-white/50 mb-2">Быстрые команды:</p>
              {quickCommands.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickCommand(cmd)}
                  className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-premium-gold text-premium-black'
                    : 'bg-white/10 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-white px-4 py-2 rounded-2xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Напишите сообщение..."
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

