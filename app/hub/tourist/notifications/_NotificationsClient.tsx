'use client';

import { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { Bell, Loader2, CheckCheck } from 'lucide-react';

// Демо-данные уведомлений
interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Бронирование подтверждено',
    message: 'Ваше бронирование тура "Восхождение на Авачинский вулкан" подтверждено.',
    time: '2026-02-25T14:30:00',
    read: false,
  },
  {
    id: '2',
    title: 'Начислены эко-баллы',
    message: 'Вам начислено 50 эко-баллов за отзыв о туре.',
    time: '2026-02-24T10:00:00',
    read: false,
  },
  {
    id: '3',
    title: 'Скидка на тур',
    message: 'Специальное предложение: скидка 15% на морскую рыбалку до конца месяца.',
    time: '2026-02-20T09:15:00',
    read: true,
  },
];

type FilterTab = 'all' | 'unread';

export default function NotificationsClient() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');

  // Имитация загрузки данных
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(DEMO_NOTIFICATIONS);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Пометить все как прочитанные
  const handleReadAll = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

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
