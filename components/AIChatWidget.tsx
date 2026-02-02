'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatSession } from '@/types';

interface AIChatWidgetProps {
  userId?: string;
  className?: string;
  onClose?: () => void;
}

export function AIChatWidget({ userId, className, onClose }: AIChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      fetchChatHistory();
    }
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat?userId=${userId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setMessages(data.data.messages || []);
        setSessionId(data.data.id);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      metadata: {},
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userId,
          message: userMessage.content,
          context: {
            location: 'Камчатка',
            preferences: {},
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, ...data.data.messages]);
        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }
      } else {
        // Добавляем сообщение об ошибке
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Извините, произошла ошибка. Попробуйте еще раз.',
          timestamp: new Date(),
          metadata: { error: true },
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: new Date(),
        metadata: { error: true },
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getQuickQuestions = () => [
    'Какие туры доступны на Камчатке?',
    'Как добраться до вулканов?',
    'Что взять с собой в поход?',
    'Где можно увидеть медведей?',
    'Какая погода на Камчатке?',
  ];

  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl flex flex-col h-96 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center">
            <span className="text-premium-black text-sm font-black">AI</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI-гид</h3>
            <p className="text-xs text-white/70">Помощник по Камчатке</p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-white/70">
            <div className="text-4xl mb-2"> </div>
            <div className="text-sm mb-4">Привет! Я AI-гид по Камчатке</div>
            <div className="text-xs text-white/50 mb-4">Задайте вопрос или выберите один из вариантов:</div>
            
            <div className="space-y-2">
              {getQuickQuestions().map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="block w-full text-left p-3 text-xs bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-premium-gold text-premium-black'
                    : 'bg-white/10 text-white'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-premium-black/70' : 'text-white/50'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-white px-4 py-3 rounded-xl">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="p-6 border-t border-white/10">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Задайте вопрос о Камчатке..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent text-sm text-white placeholder-white/50"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-bold"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}