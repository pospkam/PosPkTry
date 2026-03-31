'use client';

import { useEffect, useState, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import { Bell, CheckCheck, Loader2, Calendar, XCircle, Star } from 'lucide-react';

type NType = 'booking' | 'cancellation' | 'review';

interface Notification {
  id: string; type: NType; title: string;
  message: string; time: string; read: boolean;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  booking: Calendar, cancellation: XCircle, review: Star,
};

export default function NotificationsClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems]     = useState<Notification[]>([]);
  const [filter, setFilter]   = useState<'all' | 'unread'>('all');
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/hub/operator/notifications');
      const data = await res.json() as { notifications?: Notification[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Ошибка загрузки');
      setItems(data.notifications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadCount = items.filter(n => !n.read).length;
  const displayed   = filter === 'unread' ? items.filter(n => !n.read) : items;

  return (
    <Protected roles={['operator', 'admin']}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
              Уведомления
            </h1>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-white font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => setItems(prev => prev.map(n => ({ ...n, read: true })))}
              className="px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" /> Прочитать все
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}>
              {f === 'all' ? 'Все' : 'Непрочитанные'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : error ? (
          <div className="text-center py-16 text-[var(--danger)] text-sm">{error}</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">
              {filter === 'unread' ? 'Нет непрочитанных' : 'Нет уведомлений'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(n => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <button key={n.id}
                  onClick={() => setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                  className={`w-full text-left bg-[var(--bg-card)] border rounded-lg p-4 flex items-start gap-3 transition-colors hover:bg-[var(--bg-hover)] ${
                    n.read ? 'border-[var(--border)]' : 'border-[var(--accent)]/30'
                  }`}>
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${n.read ? 'text-[var(--text-muted)]' : 'text-[var(--accent)]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                      {n.title}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{n.message}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{n.time}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Protected>
  );
}
