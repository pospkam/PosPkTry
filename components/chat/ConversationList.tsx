'use client';

import React from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';

interface Conversation {
  id: string;
  type: string;
  subject: string | null;
  otherParticipantName: string | null;
  otherParticipantRole: string | null;
  otherParticipantId: string | null;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  lastMessageSenderName: string | null;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  tourist: 'Турист',
  operator: 'Оператор',
  guide: 'Гид',
  admin: 'Администратор',
  transfer_operator: 'Трансфер',
  agent: 'Агент',
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  if (diff < dayMs) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < dayMs * 7) {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function ConversationList({ conversations, loading, activeId, onSelect }: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageCircle className="w-8 h-8 text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-muted)]">Нет бесед</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Начните общение с оператором на странице тура
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => {
        const isActive = conv.id === activeId;
        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[var(--border)]
              ${isActive ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'}`}
          >
            {/* Avatar circle */}
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--accent)]/10
                            flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
              {(conv.otherParticipantName || '?')[0].toUpperCase()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {conv.otherParticipantName || 'Участник'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {conv.lastMessageContent || 'Нет сообщений'}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1
                                   bg-[var(--accent)] text-[var(--bg-primary)]
                                   text-[10px] font-bold font-mono
                                   rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              {conv.otherParticipantRole && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {ROLE_LABELS[conv.otherParticipantRole] || conv.otherParticipantRole}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
