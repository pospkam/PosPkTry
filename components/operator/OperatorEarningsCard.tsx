/**
 * OperatorEarningsCard — client component
 * Shows earnings dashboard for operator
 */

'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Eye, FileText } from 'lucide-react';

interface EarningsData {
  summary: {
    totalBookings: number;
    totalRevenue: number;
    confirmedBookings: number;
    pendingBookings: number;
    affiliateClicks: number;
    estimatedAffiliateCommission: number;
  };
  bookingsByDay: Array<{ date: string; total_bookings: number; total_revenue: string }>;
  affiliatePartners: Array<{ partner: string; clicks: number; unique_visitors: number }>;
}

export function OperatorEarningsCard() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch('/api/hub/operator/earnings');
        if (res.ok) {
          const data = await res.json();
          setEarnings(data);
        }
      } catch (err) {
        console.error('Failed to fetch earnings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
    const interval = setInterval(fetchEarnings, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="ds-card p-6 rounded-lg">
        <div className="h-8 bg-[var(--bg-hover)] rounded animate-pulse"></div>
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="ds-card p-6 rounded-lg text-[var(--text-muted)]">
        Не удалось загрузить данные по доходам
      </div>
    );
  }

  const { summary, affiliatePartners } = earnings;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Direct Bookings */}
      <div className="ds-card p-6 rounded-lg border border-[var(--border)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[var(--success)]" />
          </div>
          <h3 className="font-semibold text-[var(--text-primary)]">Бронирования</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Всего:</span>
            <span className="font-medium">{summary.totalBookings}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Подтверждено:</span>
            <span className="text-[var(--success)]">{summary.confirmedBookings}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">На рассмотрении:</span>
            <span className="text-[var(--warning)]">{summary.pendingBookings}</span>
          </div>
          <div className="border-t border-[var(--border)] pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Прямых продаж:</span>
              <span className="text-[var(--ocean)]">${summary.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliate Traffic */}
      <div className="ds-card p-6 rounded-lg border border-[var(--border)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <Eye className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <h3 className="font-semibold text-[var(--text-primary)]">Партнёрский трафик</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Клики:</span>
            <span className="font-medium">{summary.affiliateClicks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Партнёры:</span>
            <span className="font-medium">{affiliatePartners.length}</span>
          </div>
          <div className="border-t border-[var(--border)] pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Предполагаемый доход:</span>
              <span className="text-[var(--success)]">${summary.estimatedAffiliateCommission}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Partners */}
      {affiliatePartners.length > 0 && (
        <div className="ds-card p-6 rounded-lg border border-[var(--border)] md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--ocean)]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[var(--ocean)]" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)]">Топ партнёры</h3>
          </div>
          <div className="space-y-2 text-sm">
            {affiliatePartners.map((p) => (
              <div key={p.partner} className="flex justify-between items-center p-2 rounded bg-[var(--bg-hover)]">
                <span className="text-[var(--text-primary)]">{p.partner}</span>
                <div className="flex gap-3 text-[var(--text-muted)]">
                  <span>{p.clicks} клик</span>
                  <span>{p.unique_visitors} уникальных</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
