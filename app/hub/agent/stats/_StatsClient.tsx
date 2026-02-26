'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { BarChart3, TrendingUp, Loader2, Users, Repeat, DollarSign } from 'lucide-react';

interface MonthCommission { month: string; amount: number; }

export default function StatsClient() {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<MonthCommission[]>([]);
  const [retention, setRetention] = useState(0);
  const [topTours, setTopTours] = useState<Array<{ name: string; bookings: number }>>([]);

  useEffect(() => {
    setTimeout(() => {
      setCommissions([
        { month: 'Сен', amount: 45000 }, { month: 'Окт', amount: 38000 },
        { month: 'Ноя', amount: 22000 }, { month: 'Дек', amount: 15000 },
        { month: 'Янв', amount: 28000 }, { month: 'Фев', amount: 52000 },
      ]);
      setRetention(34);
      setTopTours([
        { name: 'Восхождение на Авачинский', bookings: 8 },
        { name: 'Рыбалка на Жупанова', bookings: 6 },
        { name: 'Долина гейзеров', bookings: 4 },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const totalEarned = commissions.reduce((s, c) => s + c.amount, 0);
  const maxAmount = Math.max(...commissions.map(c => c.amount), 1);

  return (
    <Protected roles={['agent', 'admin']}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Статистика</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1"><DollarSign className="w-4 h-4" /> Заработано (6 мес)</div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{(totalEarned / 1000).toFixed(0)}K rub</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1"><Repeat className="w-4 h-4" /> Удержание клиентов</div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{retention}%</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1"><Users className="w-4 h-4" /> Повторные клиенты</div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">12</p>
              </div>
            </div>

            {/* Комиссии по месяцам */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Комиссии по месяцам</h2>
              <div className="flex items-end gap-3 h-32">
                {commissions.map(c => (
                  <div key={c.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-muted)]">{(c.amount / 1000).toFixed(0)}K</span>
                    <div className="w-full bg-[var(--accent)] rounded-t-md" style={{ height: `${(c.amount / maxAmount) * 100}%` }} />
                    <span className="text-xs text-[var(--text-secondary)]">{c.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Топ туры */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Лучшие туры</h2>
              <div className="space-y-3">
                {topTours.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="text-[var(--text-primary)]">{t.name}</span>
                    </div>
                    <span className="text-sm text-[var(--text-secondary)]">{t.bookings} бронирований</span>
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
