'use client';

import { useState, useEffect, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Loader2, ArrowLeft, Send } from 'lucide-react';

interface ConversationItem {
  id: string;
  type: string;
  subject: string | null;
  otherParticipantName: string | null;
  otherParticipantRole: string | null;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: string;
  senderName: string;
  senderRole: string;
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
  if (diff < dayMs) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (diff < dayMs * 7) return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
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

export default function MessagesClient() {
  const { user } = useAuth();
  const userId = user?.id;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat/conversations?limit=50');
      const result = await res.json();
      if (result.success) {
        setConversations(
          (result.data.conversations as Record<string, unknown>[]).map((c) => ({
            id: c.id as string,
            type: c.type as string,
            subject: c.subject as string | null,
            otherParticipantName: c.other_participant_name as string | null,
            otherParticipantRole: c.other_participant_role as string | null,
            lastMessageContent: c.last_message_content as string | null,
            lastMessageAt: c.last_message_at as string | null,
            unreadCount: parseInt(String(c.unread_count)) || 0,
          }))
        );
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Poll conversations every 10s
  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (convId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/chat/conversations/${convId}/messages?limit=100`);
      const result = await res.json();
      if (result.success) {
        setMessages(
          (result.data.messages as Record<string, unknown>[]).map((m) => ({
            id: m.id as string,
            senderId: m.sender_id as string,
            content: m.content as string,
            messageType: m.message_type as string,
            createdAt: m.created_at as string,
            senderName: m.sender_name as string,
            senderRole: m.sender_role as string,
          }))
        );
      }
      // Mark as read
      await fetch(`/api/chat/conversations/${convId}/read`, { method: 'POST' });
    } catch { /* silent */ }
    setMessagesLoading(false);
  }, []);

  // Poll messages for active conversation
  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId);
    const interval = setInterval(() => fetchMessages(activeId), 10000);
    return () => clearInterval(interval);
  }, [activeId, fetchMessages]);

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setMessages([]);
    setInputValue('');
  };

  const handleBack = () => {
    setActiveId(null);
    setMessages([]);
    fetchConversations();
  };

  const handleSend = async () => {
    if (!activeId || !inputValue.trim() || sending) return;
    const text = inputValue.trim();
    setSending(true);
    setInputValue('');
    try {
      const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const result = await res.json();
      if (result.success) {
        const m = result.data;
        setMessages(prev => [...prev, {
          id: m.id,
          senderId: m.sender_id,
          content: m.content,
          messageType: m.message_type,
          createdAt: m.created_at,
          senderName: 'Вы',
          senderRole: '',
        }]);
      }
    } catch {
      setInputValue(text);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const activeConv = conversations.find(c => c.id === activeId);

  // Group messages by date
  let lastDate = '';

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 py-6 lg:py-8">
        <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6">
          Сообщения
        </h1>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden flex" style={{ minHeight: '500px' }}>
          {/* Left: conversation list */}
          <div className={`w-full md:w-80 md:border-r border-[var(--border)] flex flex-col shrink-0 ${
            activeId ? 'hidden md:flex' : 'flex'
          }`}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                <p className="text-sm text-[var(--text-muted)]">Нет бесед</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Начните общение с оператором на странице тура
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[var(--border)] ${
                      conv.id === activeId ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-sm font-semibold text-[var(--accent)]">
                      {(conv.otherParticipantName || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {conv.otherParticipantName || 'Участник'}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {conv.lastMessageContent || 'Нет сообщений'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.otherParticipantRole && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {ROLE_LABELS[conv.otherParticipantRole] || conv.otherParticipantRole}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: message thread */}
          <div className={`flex-1 flex flex-col ${
            activeId ? 'flex' : 'hidden md:flex'
          }`}>
            {!activeId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                <p className="text-sm text-[var(--text-muted)]">Выберите беседу</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                  <button
                    onClick={handleBack}
                    className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                  </button>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-sm font-semibold text-[var(--accent)]">
                    {(activeConv?.otherParticipantName || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {activeConv?.otherParticipantName || 'Участник'}
                    </h3>
                    {activeConv?.otherParticipantRole && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {ROLE_LABELS[activeConv.otherParticipantRole] || activeConv.otherParticipantRole}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-[var(--text-muted)]">Начните общение</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === userId;
                      const msgDate = formatDateSeparator(msg.createdAt);
                      const showDateSep = msgDate !== lastDate;
                      lastDate = msgDate;

                      return (
                        <div key={msg.id}>
                          {showDateSep && (
                            <div className="flex justify-center py-2">
                              <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-0.5 rounded">
                                {msgDate}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                              msg.messageType === 'system'
                                ? 'italic text-[var(--text-muted)] text-xs text-center w-full bg-transparent'
                                : isMine
                                  ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]'
                                  : 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                            }`}>
                              {!isMine && msg.messageType !== 'system' && (
                                <p className="text-xs font-medium text-[var(--accent)] mb-0.5">
                                  {msg.senderName}
                                  {msg.senderRole && (
                                    <span className="text-[var(--text-muted)] ml-1">
                                      {ROLE_LABELS[msg.senderRole] || ''}
                                    </span>
                                  )}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isMine ? 'text-[var(--text-muted)] text-right' : 'text-[var(--text-muted)]'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-[var(--border)] px-4 py-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Введите сообщение..."
                      rows={1}
                      className="flex-1 resize-none bg-[var(--bg-hover)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] max-h-24 overflow-y-auto"
                    />
                    <button
                      onClick={() => { void handleSend(); }}
                      disabled={!inputValue.trim() || sending}
                      className="p-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-40 transition-opacity"
                    >
                      {sending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Protected>
  );
}
