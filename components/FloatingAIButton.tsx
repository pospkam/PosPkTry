'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import dynamic from 'next/dynamic';

// Динамический импорт AIChatWidget для оптимизации
const AIChatWidget = dynamic(() => import('@/components/AIChatWidget'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
    </div>
  )
});

export default function FloatingAIButton() {
  const [showAIChat, setShowAIChat] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowAIChat(!showAIChat)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 hover:from-yellow-500 hover:via-orange-500 hover:to-pink-600 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 group"
        aria-label="AI помощник"
      >
        {showAIChat ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        )}
      </button>

      {/* AI.Kam Chat Widget */}
      {showAIChat && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">AI.Kam</h3>
                <p className="text-white/80 text-xs">Твой AI помощник</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAIChat(false)}
              className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Chat Content */}
          <div className="h-[calc(100%-64px)]">
            <AIChatWidget />
          </div>
        </div>
      )}
    </>
  );
}
