'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Calendar, Thermometer, ShieldCheck, Mic, Send, MessageCircle } from 'lucide-react';
import { ChatMessage } from '@/types';

interface AIChatWidgetProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function AIChatWidget({ isOpen = false, onClose, className }: AIChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ... existing logic for messages, sendMessage, etc. ...

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed bottom-6 right-6 w-96 h-[520px] glassmorphism shadow-2xl z-50 ${className || ''}`}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 500 }}
        >
          <div className="flex items-center justify-between p-6 border-b border-white/20 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <Bot size={24} className="text-ocean" />
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
              <X size={20} />
            </motion.button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
                <div className={`max-w-xs p-3 rounded-2xl ${
                  msg.role === 'user' ? 'bg-ocean text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-volcano rounded-full animate-bounce" style={{animationDelay: '0s'}} />
                <div className="w-2 h-2 bg-volcano rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                <div className="w-2 h-2 bg-volcano rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-6 border-t border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <input 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Спросите о Камчатке..."
                className="flex-1 px-4 py-3 rounded-full bg-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-ocean placeholder-volcano text-sm"
              />
              <motion.button className="p-3 bg-gray-100 hover:bg-ocean hover:text-white rounded-full" whileHover={{ scale: 1.05 }}>
                <Mic size={18} />
              </motion.button>
              <motion.button className="p-3 bg-ocean text-white rounded-full" whileHover={{ scale: 1.05 }} onClick={() => {/* send */}}>
                <Send size={18} />
              </motion.button>
            </div>
            <div className="flex gap-2">
              <motion.button className="flex-1 px-3 py-2 bg-gray-100 hover:bg-ocean hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px]" whileHover={{ scale: 1.05 }}>
                <Calendar size={14} /> Планировать тур
              </motion.button>
              <motion.button className="flex-1 px-3 py-2 bg-gray-100 hover:bg-ocean hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px]" whileHover={{ scale: 1.05 }}>
                <Thermometer size={14} /> Погода
              </motion.button>
              <motion.button className="flex-1 px-3 py-2 bg-gray-100 hover:bg-ocean hover:text-white rounded-full text-xs font-medium flex items-center gap-1 justify-center min-h-[36px]" whileHover={{ scale: 1.05 }}>
                <ShieldCheck size={14} /> Безопасность
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
