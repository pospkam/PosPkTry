'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { BarChart3, TrendingUp, Loader2, DollarSign, Eye, ShoppingCart } from 'lucide-react';

interface MonthData { month: string; revenue: number; bookings: number; }
interface TopTour { name: string; revenue: number; bookings: number; }

export default function AnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState<MonthData[]>([]);
  const [topTours, setTopTours] = useState<TopTour[]>([]);
  const [conversionRate, setConversionRate] = useState(0);

  useEffect(() => {
    // Загрузка аналитики оператора
    setTimeout(() => {
      setMonths([
        { month: 'Сен', revenue: 420000, bookings: 14 },
        { month: 'Окт', revenue: 380000, bookings: 11 },
        { month: 'Ноя', revenue: 150000, bookings: 5 },
        { month: 'Дек', revenue: 90000, bookings: 3 },
        { month: 'Янв', revenue: 210000, bookings: 7 },
        { month: 'Фев', revenue: 350000, bookings: 12 },
      ]);
      setTopTours([
        { name: 'Восхождение на Авачинский', revenue: 540000, bookings: 18 },
        { name: 'Рыбалка на Жупанова', revenue: 320000, bookings: 16 },
        { name: 'Долина гейзеров', revenue: 280000, bookings: 8 },
      ]);
      setConversionRate(4.2);
      setLoading(false);
    }, 500);
  }, []);

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalBookings = months.reduce((s, m) => s + m.bookings, 0);
  const maxRevenue = Math.max(...months.map(m => m.revenue), 1);

  return (
    <Protected roles={['operator', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Аналитика</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : (
          <div className="space-y-6">
            {/* KPI карточки */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1"><DollarSign className="w-4 h-4" /> Выручка (6 мес)</div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{(totalRevenue / 1000).toFixed(0)}K rub</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1"><ShoppingCart className="w-4 h-4" /> Бронирований</div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{totalBookings}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1"><Eye className="w-4 h-4" /> Конверсия</div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{conversionRate}%</p>
              </div>
            </div>

            {/* Выручка по месяцам (простая CSS-диаграмма) */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Выручка по месяцам</h2>
              <div className="flex items-end gap-3 h-40">
                {months.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-muted)]">{(m.revenue / 1000).toFixed(0)}K</span>
                    <div className="w-full bg-[var(--accent)] rounded-t-md transition-all" style={{ height: `${(m.revenue / maxRevenue) * 100}%` }} />
                    <span className="text-xs text-[var(--text-secondary)]">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Топ туров */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Топ туры по выручке</h2>
              <div className="space-y-3">
                {topTours.map((tour, idx) => (
                  <div key={tour.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      <span className="text-[var(--text-primary)]">{tour.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{(tour.revenue / 1000).toFixed(0)}K rub</p>
                      <p className="text-xs text-[var(--text-muted)]">{tour.bookings} бронирований</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
