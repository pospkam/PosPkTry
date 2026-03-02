'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { Calendar, Loader2, Check, X, Users, MapPin } from 'lucide-react';

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
interface TransferBooking { id: string; route: string; date: string; passengers: number; price: number; status: BookingStatus; clientName: string; }

const STATUS_LABELS: Record<BookingStatus, string> = { pending: 'Ожидает', confirmed: 'Подтверждён', completed: 'Завершён', cancelled: 'Отменён' };
const STATUS_CLASSES: Record<BookingStatus, string> = {
  pending: 'bg-[var(--warning)]/15 text-[var(--warning)]',
  confirmed: 'bg-[var(--accent)]/15 text-[var(--accent)]',
  completed: 'bg-[var(--success)]/15 text-[var(--success)]',
  cancelled: 'bg-[var(--danger)]/15 text-[var(--danger)]',
};

export default function TransferBookingsClient() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<TransferBooking[]>([]);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');

  useEffect(() => {
    setTimeout(() => {
      setBookings([
        { id: '1', route: 'Елизово -- Петропавловск', date: '2026-03-15', passengers: 4, price: 3000, status: 'pending', clientName: 'Анна М.' },
        { id: '2', route: 'Петропавловск -- Паратунка', date: '2026-03-14', passengers: 2, price: 5000, status: 'confirmed', clientName: 'Дмитрий К.' },
        { id: '3', route: 'Елизово -- Начики', date: '2026-03-10', passengers: 6, price: 8000, status: 'completed', clientName: 'Группа Иванова' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  function updateStatus(id: string, status: BookingStatus) { setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b)); }
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <Protected roles={['transfer_operator', 'transfer', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Бронирования трансферов</h1>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`min-h-[44px] px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${filter === f ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {f === 'all' ? 'Все' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" /><p className="text-[var(--text-secondary)]">Нет бронирований</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => (
              <div key={b.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[var(--accent)]" /><span className="font-medium text-[var(--text-primary)]">{b.route}</span></div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-[var(--text-secondary)]">
                    <span>{new Date(b.date).toLocaleDateString('ru-RU')}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{b.passengers}</span>
                    <span className="text-[var(--accent)] font-medium">{b.price.toLocaleString('ru-RU')} rub</span>
                    <span>{b.clientName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CLASSES[b.status]}`}>{STATUS_LABELS[b.status]}</span>
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(b.id, 'confirmed')} className="min-h-[44px] p-2 text-[var(--success)] hover:bg-[var(--success)]/10 rounded-xl"><Check className="w-5 h-5" /></button>
                      <button onClick={() => updateStatus(b.id, 'cancelled')} className="min-h-[44px] p-2 text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-xl"><X className="w-5 h-5" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Protected>
  );
}
