'use client';

import { useState } from 'react';
import { Protected } from '@/components/auth/Protected';
import { Bell, Loader2, CheckCheck } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsApiResponse {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
  }>;
}

type FilterTab = 'all' | 'unread';

export default function NotificationsClient() {
  const [filter, setFilter] = useState<FilterTab>('all');

  const { data: notifications, loading, error, setData } = useApiFetch<
    NotificationsApiResponse,
    Notification[]
  >(
    '/api/notifications?limit=50',
    (d) => (d?.notifications ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      time: n.createdAt,
      read: n.isRead,
    })),
    { errorMessage: 'Не удалось загрузить уведомления' },
  );

  const list = notifications ?? [];

  const handleReadAll = async () => {
    setData((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    } catch {
      // silent — already updated optimistically
    }
  };

  const filtered = filter === 'unread' ? list.filter((n) => !n.read) : list;
  const unreadCount = list.filter((n) => !n.read).length;

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Уведомления
          </h1>

          {unreadCount > 0 && (
            <button
              onClick={handleReadAll}
              className="flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--accent)',
                border: '1px solid var(--border)',
              }}
            >
              <CheckCheck className="w-4 h-4" />
              Прочитать все
            </button>
          )}
        </div>

        {/* Фильтр: все / непрочитанные */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className="min-h-[44px] px-5 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: filter === 'all' ? 'var(--accent)' : 'var(--bg-card)',
              color: filter === 'all' ? '#fff' : 'var(--text-secondary)',
              border: filter === 'all' ? 'none' : '1px solid var(--border)',
            }}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('unread')}
            className="min-h-[44px] px-5 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: filter === 'unread' ? 'var(--accent)' : 'var(--bg-card)',
              color: filter === 'unread' ? '#fff' : 'var(--text-secondary)',
              border: filter === 'unread' ? 'none' : '1px solid var(--border)',
            }}
          >
            Непрочитанные ({unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: 'var(--accent)' }}
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell
              className="w-16 h-16 mb-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              {error}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell
              className="w-16 h-16 mb-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <p
              className="text-lg"
              style={{ color: 'var(--text-muted)' }}
            >
              Нет новых уведомлений
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-4 rounded-xl border p-4"
                style={{
                  backgroundColor: notification.read
                    ? 'var(--bg-card)'
                    : 'var(--bg-primary)',
                  borderColor: 'var(--border)',
                }}
              >
                {/* Индикатор непрочитанного */}
                <div className="pt-1 flex-shrink-0">
                  {!notification.read ? (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: 'var(--accent)' }}
                    />
                  ) : (
                    <div className="w-2.5 h-2.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {notification.title}
                  </h3>
                  <p
                    className="text-sm mt-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {notification.message}
                  </p>
                  <span
                    className="text-xs mt-2 block"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {new Date(notification.time).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
