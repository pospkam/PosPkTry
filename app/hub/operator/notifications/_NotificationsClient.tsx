'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { Bell, CheckCheck, Loader2, Calendar, XCircle, Star, ArrowRightLeft } from 'lucide-react';

type NType = 'booking' | 'cancellation' | 'review' | 'transfer';
interface Notification { id: string; type: NType; title: string; message: string; time: string; read: boolean; }

const TYPE_ICONS: Record<NType, typeof Bell> = { booking: Calendar, cancellation: XCircle, review: Star, transfer: ArrowRightLeft };

export default function NotificationsClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    setTimeout(() => {
      setItems([
        { id: '1', type: 'booking', title: 'Новое бронирование', message: 'Анна М. забронировала "Восхождение на Авачинский" на 15 марта', time: '2 часа назад', read: false },
        { id: '2', type: 'review', title: 'Новый отзыв', message: 'Дмитрий К. оставил отзыв на "Рыбалка на Жупанова" -- 4 звезды', time: '5 часов назад', read: false },
        { id: '3', type: 'transfer', title: 'Запрос на переброс', message: 'Оператор "Камчатка Тур" предлагает переброс бронирования с комиссией 15%', time: 'вчера', read: true },
        { id: '4', type: 'cancellation', title: 'Отмена бронирования', message: 'Елена С. отменила бронирование на 20 марта', time: '2 дня назад', read: true },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  function markAllRead() { setItems(prev => prev.map(n => ({ ...n, read: true }))); }
  function markRead(id: string) { setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); }

  const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;
  const unreadCount = items.filter(n => !n.read).length;

  return (
    <Protected roles={['operator', 'admin']}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Уведомления</h1>
            {unreadCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-white">{unreadCount}</span>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="min-h-[44px] px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl transition-colors inline-flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4" /> Прочитать все
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`min-h-[44px] px-4 py-2 rounded-xl text-sm transition-colors ${filter === f ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {f === 'all' ? 'Все' : 'Непрочитанные'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Нет уведомлений</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => {
              const Icon = TYPE_ICONS[n.type];
              return (
                <button key={n.id} onClick={() => markRead(n.id)} className={`w-full text-left bg-[var(--bg-card)] border rounded-xl p-4 flex items-start gap-3 transition-colors ${n.read ? 'border-[var(--border)]' : 'border-[var(--accent)]/30 bg-[var(--accent)]/5'}`}>
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${n.read ? 'text-[var(--text-muted)]' : 'text-[var(--accent)]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{n.title}</p>
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
