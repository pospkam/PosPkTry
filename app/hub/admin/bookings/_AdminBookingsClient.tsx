'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { Calendar, Loader2, Search, Download, Filter } from 'lucide-react';

type BStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
interface Booking { id: string; tourName: string; touristName: string; operatorName: string; date: string; price: number; status: BStatus; }

const ST_CLS: Record<BStatus, string> = { pending: 'bg-[var(--warning)]/15 text-[var(--warning)]', confirmed: 'bg-[var(--accent)]/15 text-[var(--accent)]', completed: 'bg-[var(--success)]/15 text-[var(--success)]', cancelled: 'bg-[var(--danger)]/15 text-[var(--danger)]' };
const ST_LBL: Record<BStatus, string> = { pending: 'Ожидает', confirmed: 'Подтверждён', completed: 'Завершён', cancelled: 'Отменён' };

export default function AdminBookingsClient() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BStatus | 'all'>('all');

  useEffect(() => {
    setTimeout(() => {
      setBookings([
        { id: '1', tourName: 'Восхождение на Авачинский', touristName: 'Анна М.', operatorName: 'Камчатская Рыбалка', date: '2026-03-15', price: 25000, status: 'confirmed' },
        { id: '2', tourName: 'Долина гейзеров', touristName: 'Дмитрий К.', operatorName: 'Вулканы Камчатки', date: '2026-03-20', price: 45000, status: 'pending' },
        { id: '3', tourName: 'Рыбалка на Жупанова', touristName: 'Елена С.', operatorName: 'Камчатская Рыбалка', date: '2026-02-28', price: 18000, status: 'completed' },
        { id: '4', tourName: 'Термальные источники', touristName: 'Сергей В.', operatorName: 'Вулканы Камчатки', date: '2026-03-01', price: 12000, status: 'cancelled' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filtered = bookings.filter(b => {
    const matchSearch = b.tourName.toLowerCase().includes(search.toLowerCase()) || b.touristName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <Protected roles={['admin']}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><Calendar className="w-6 h-6 text-[var(--accent)]" /><h1 className="text-2xl font-bold text-[var(--text-primary)]">Все бронирования</h1></div>
          <button className="min-h-[44px] px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-secondary)] text-sm inline-flex items-center gap-2 hover:border-[var(--border-strong)]">
            <Download className="w-4 h-4" /> Экспорт CSV
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по туру или туристу..." className="w-full min-h-[44px] pl-10 pr-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`min-h-[44px] px-3 py-2 rounded-xl text-sm whitespace-nowrap ${statusFilter === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
                {s === 'all' ? 'Все' : ST_LBL[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" /><p className="text-[var(--text-secondary)]">Бронирования не найдены</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="p-3">Тур</th><th className="p-3">Турист</th><th className="p-3">Оператор</th><th className="p-3">Дата</th><th className="p-3">Цена</th><th className="p-3">Статус</th>
              </tr></thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
                    <td className="p-3 text-[var(--text-primary)]">{b.tourName}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{b.touristName}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{b.operatorName}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{new Date(b.date).toLocaleDateString('ru-RU')}</td>
                    <td className="p-3 text-[var(--text-primary)] font-medium">{b.price.toLocaleString('ru-RU')} rub</td>
                    <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${ST_CLS[b.status]}`}>{ST_LBL[b.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Protected>
  );
}
