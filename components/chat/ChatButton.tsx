'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatButtonProps {
  unreadCount: number;
  onClick: () => void;
}

export function ChatButton({ unreadCount, onClick }: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40
                 w-12 h-12 rounded-full
                 bg-[var(--accent)] hover:opacity-90
                 flex items-center justify-center
                 shadow-lg transition-all"
      aria-label="Открыть чат"
    >
      <MessageCircle className="w-5 h-5 text-[var(--bg-primary)]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                         bg-[var(--danger)] text-[var(--bg-primary)]
                         text-[10px] font-bold font-mono
                         rounded-full flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
