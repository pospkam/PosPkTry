'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  isDeleted: boolean;
  createdAt: string;
  senderName: string;
  senderRole: string;
}

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  otherParticipantName: string;
  onBack: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  tourist: 'Турист',
  operator: 'Оператор',
  guide: 'Гид',
  admin: 'Администратор',
  transfer_operator: 'Трансфер',
  agent: 'Агент',
};

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function MessageThread({
  conversationId,
  currentUserId,
  otherParticipantName,
  onBack,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastFetchRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages
  const fetchMessages = async (isInitial = false) => {
    try {
      const url = lastFetchRef.current && !isInitial
        ? `/api/chat/conversations/${conversationId}/messages?after=${encodeURIComponent(lastFetchRef.current)}`
        : `/api/chat/conversations/${conversationId}/messages?limit=100`;

      const res = await fetch(url);
      const result = await res.json();

      if (result.success && result.data.messages.length > 0) {
        const newMessages: Message[] = result.data.messages.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          conversationId: m.conversation_id as string,
          senderId: m.sender_id as string,
          content: m.content as string,
          messageType: m.message_type as string,
          isDeleted: m.is_deleted as boolean,
          createdAt: m.created_at as string,
          senderName: m.sender_name as string,
          senderRole: m.sender_role as string,
        }));

        if (isInitial || !lastFetchRef.current) {
          setMessages(newMessages);
        } else {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const unique = newMessages.filter(m => !existingIds.has(m.id));
            return [...prev, ...unique];
          });
        }

        const last = newMessages[newMessages.length - 1];
        lastFetchRef.current = last.createdAt;
      }
    } catch {
      // Silent fail on polling
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Mark as read
  const markAsRead = async () => {
    try {
      await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
      });
    } catch {
      // Silent
    }
  };

  // Initial load
  useEffect(() => {
    lastFetchRef.current = null;
    setMessages([]);
    setLoading(true);
    fetchMessages(true);
    markAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages(false);
      markAsRead();
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Send message
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    setSending(true);
    setInputValue('');

    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const result = await res.json();

      if (result.success) {
        const m = result.data;
        const newMsg: Message = {
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          content: m.content,
          messageType: m.message_type,
          isDeleted: m.is_deleted,
          createdAt: m.created_at,
          senderName: 'Вы',
          senderRole: '',
        };
        setMessages(prev => [...prev, newMsg]);
        lastFetchRef.current = newMsg.createdAt;
      }
    } catch {
      // Restore input on error
      setInputValue(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  let lastDate = '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {otherParticipantName}
          </h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-[var(--text-muted)]">Начните общение</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            const msgDate = formatDateSeparator(msg.createdAt);
            const showDateSep = msgDate !== lastDate;
            lastDate = msgDate;

            return (
              <React.Fragment key={msg.id}>
                {showDateSep && (
                  <div className="flex justify-center py-2">
                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-0.5 rounded">
                      {msgDate}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm
                    ${isMine
                      ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    }
                    ${msg.messageType === 'system' ? 'italic text-[var(--text-muted)] text-xs text-center w-full bg-transparent' : ''}`}>
                    {!isMine && msg.messageType !== 'system' && (
                      <p className="text-[10px] font-medium text-[var(--accent)] mb-0.5">
                        {msg.senderName}
                        {msg.senderRole && (
                          <span className="text-[var(--text-muted)] ml-1">
                            {ROLE_LABELS[msg.senderRole] || ''}
                          </span>
                        )}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-[var(--text-muted)] text-right' : 'text-[var(--text-muted)]'}`}>
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            rows={1}
            className="flex-1 resize-none bg-[var(--bg-hover)] text-[var(--text-primary)]
                       placeholder:text-[var(--text-muted)]
                       text-sm px-3 py-2 rounded-lg border border-[var(--border)]
                       focus:outline-none focus:border-[var(--accent)]
                       max-h-24 overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className="p-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)]
                       disabled:opacity-40 transition-opacity"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
