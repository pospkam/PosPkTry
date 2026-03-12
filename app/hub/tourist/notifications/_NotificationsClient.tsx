'use client';

import { useState, useEffect, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import { Bell, Loader2, CheckCheck, Settings } from 'lucide-react';
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
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);

  const fetchPrefs = useCallback(async () => {
    setPrefsLoading(true);
    try {
      const res = await fetch('/api/tourist/notification-preferences');
      const json = await res.json();
      if (json.success && json.data) {
        setPrefs(json.data);
      }
    } catch { /* ignore */ }
    setPrefsLoading(false);
  }, []);

  const togglePref = async (key: string, value: boolean) => {
    setPrefs(prev => prev ? { ...prev, [key]: value } : null);
    try {
      await fetch('/api/tourist/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch { /* silent */ }
  };

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

        {/* Notification Preferences */}
        <div className="mt-8">
          <button
            onClick={() => { setShowPrefs(!showPrefs); if (!prefs) fetchPrefs(); }}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Settings className="w-4 h-4" />
            Настройки уведомлений
          </button>

          {showPrefs && (
            <div className="mt-4 rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              {prefsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
              ) : prefs ? (
                <>
                  <PrefSection title="Email" items={[
                    { key: 'email_booking_confirmation', label: 'Подтверждение бронирования' },
                    { key: 'email_booking_reminder', label: 'Напоминания о туре' },
                    { key: 'email_booking_changes', label: 'Изменения бронирования' },
                    { key: 'email_payment_receipts', label: 'Чеки оплаты' },
                    { key: 'email_promotions', label: 'Акции и скидки' },
                    { key: 'email_recommendations', label: 'Рекомендации' },
                  ]} prefs={prefs} onToggle={togglePref} />

                  <PrefSection title="Push" items={[
                    { key: 'push_booking_updates', label: 'Обновления бронирований' },
                    { key: 'push_messages', label: 'Сообщения' },
                    { key: 'push_promotions', label: 'Акции' },
                    { key: 'push_recommendations', label: 'Рекомендации' },
                  ]} prefs={prefs} onToggle={togglePref} />

                  <PrefSection title="SMS" items={[
                    { key: 'sms_booking_confirmation', label: 'Подтверждение бронирования' },
                    { key: 'sms_booking_reminder', label: 'Напоминания' },
                    { key: 'sms_emergency_alerts', label: 'Экстренные оповещения' },
                  ]} prefs={prefs} onToggle={togglePref} />
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Настройки недоступны. Создайте профиль туриста.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}

function PrefSection({ title, items, prefs, onToggle }: {
  title: string;
  items: { key: string; label: string }[];
  prefs: Record<string, boolean>;
  onToggle: (key: string, val: boolean) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <div className="space-y-2">
        {items.map(item => (
          <label key={item.key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
            <button
              onClick={() => onToggle(item.key, !prefs[item.key])}
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{ backgroundColor: prefs[item.key] ? 'var(--accent)' : 'var(--border)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                style={{ left: prefs[item.key] ? '22px' : '2px' }}
              />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
