'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatButton } from './ChatButton';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';

interface ConversationItem {
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

export function ChatWidget() {
  const { user } = useAuth();
  const userId = user?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch('/api/chat/conversations?limit=50');
      const result = await res.json();

      if (result.success) {
        const items: ConversationItem[] = result.data.conversations.map(
          (c: Record<string, unknown>) => ({
            id: c.id as string,
            type: c.type as string,
            subject: c.subject as string | null,
            otherParticipantName: c.other_participant_name as string | null,
            otherParticipantRole: c.other_participant_role as string | null,
            otherParticipantId: c.other_participant_id as string | null,
            lastMessageContent: c.last_message_content as string | null,
            lastMessageAt: c.last_message_at as string | null,
            lastMessageSenderName: c.last_message_sender_name as string | null,
            unreadCount: parseInt(String(c.unread_count)) || 0,
          })
        );
        setConversations(items);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch unread count
  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/chat/unread');
      const result = await res.json();
      if (result.success) {
        setTotalUnread(result.data.total);
      }
    } catch {
      // Silent
    }
  }, [userId]);

  // Poll unread count every 10 seconds
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Fetch conversations when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  // Refresh conversations when returning from a thread
  useEffect(() => {
    if (isOpen && !activeConversationId) {
      fetchConversations();
    }
  }, [isOpen, activeConversationId, fetchConversations]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveConversationId(null);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleBackToList = () => {
    setActiveConversationId(null);
    fetchUnread();
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Escape key to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Don't render if not authenticated
  if (!userId) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <ChatButton unreadCount={totalUnread} onClick={handleOpen} />
      )}

      {/* Slide panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 md:bg-transparent md:pointer-events-none"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="fixed bottom-0 right-0 z-50
                          w-full h-[85vh]
                          md:w-[380px] md:h-[600px] md:bottom-6 md:right-6 md:rounded-lg
                          bg-[var(--bg-card)] border border-[var(--border)]
                          shadow-xl flex flex-col overflow-hidden">
            {/* Panel header */}
            {!activeConversationId && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Сообщения
                  {totalUnread > 0 && (
                    <span className="ml-2 text-xs font-mono text-[var(--accent)]">
                      {totalUnread}
                    </span>
                  )}
                </h2>
                <button
                  onClick={handleClose}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {activeConversationId ? (
                <MessageThread
                  conversationId={activeConversationId}
                  currentUserId={userId}
                  otherParticipantName={activeConversation?.otherParticipantName || 'Участник'}
                  onBack={handleBackToList}
                />
              ) : (
                <div className="h-full overflow-y-auto">
                  <ConversationList
                    conversations={conversations}
                    loading={loading}
                    activeId={activeConversationId}
                    onSelect={handleSelectConversation}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
