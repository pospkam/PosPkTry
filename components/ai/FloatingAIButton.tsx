'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import dynamic from 'next/dynamic';

// Динамический импорт AIChatWidget для оптимизации
const AIChatWidget = dynamic(
  () => import('@/components/ai/AIChatWidget').then(m => ({ default: m.AIChatWidget })),
  {
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
        className="fixed bottom-32 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 hover:from-yellow-500 hover:via-orange-500 hover:to-pink-600 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 group"
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

      <AIChatWidget isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
    </>
  );
}
