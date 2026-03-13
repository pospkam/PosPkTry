'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, AlertCircle, Send, CheckCheck, Clock, Info } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/engagement/notifications');
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(
          (json.data as Array<{ id: string; type: string; title: string; message: string; created_at: string; is_read: boolean }>).map(
            (n) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              createdAt: n.created_at,
              isRead: n.is_read,
            })
          )
        );
      } else {
        setNotifications([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all' ? notifications : notifications.filter(n => !n.isRead);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-5 w-36 bg-[var(--bg-hover)] rounded animate-pulse" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
            <span className="text-sm text-[var(--text-primary)]">Ошибка</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">{error}</p>
          <button onClick={fetchData} className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Уведомления</h1>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[var(--danger)] text-[var(--text-primary)] text-[9px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg-card)] border border-[var(--border)] rounded-md overflow-hidden">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  filter === f
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {f === 'all' ? 'Все' : 'Непрочитанные'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <CheckCheck className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text-muted)]">
            {filter === 'unread' ? 'Нет непрочитанных уведомлений' : 'Нет уведомлений'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`bg-[var(--bg-card)] border rounded-lg px-4 py-3 flex items-start gap-3 ${
                n.isRead ? 'border-[var(--border)]' : 'border-[var(--accent)]/30 bg-[var(--accent-muted)]'
              }`}
            >
              <div className="mt-0.5">
                {n.type === 'booking' ? (
                  <Send className="w-3.5 h-3.5 text-[var(--success)]" />
                ) : n.type === 'system' ? (
                  <Info className="w-3.5 h-3.5 text-[var(--accent)]" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)]">{n.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{n.message}</p>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono whitespace-nowrap shrink-0">
                {new Date(n.createdAt).toLocaleString('ru-RU', {
                  hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Рассылки</p>
        <p className="text-xs text-[var(--text-secondary)]">
          Массовые уведомления через Telegram и Email — в разработке.
        </p>
      </div>

    </div>
  );
}
