'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Banknote, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';

interface TourPayment {
  id: string;
  operator_id: string;
  operator_name: string;
  tour_title: string;
  booking_date: string;
  tourist_name: string;
  participants: number;
  retail_amount: string;
  net_amount: string;
  commission_amount: string;
  commission_rate: string;
  status: string;
  paid_at: string;
  release_after: string;
  released_at: string | null;
  cp_transaction_id: string | null;
}

interface ReadyGroup {
  operator_id: string;
  operator_name: string;
  count: string;
  total_net: string;
}

interface Stats {
  totalRetail: number;
  totalNet: number;
  totalCommission: number;
  heldNet: number;
  releasedNet: number;
  heldCount: number;
  releasedCount: number;
  refundedCount: number;
}

function formatRub(val: string | number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0
  }).format(Number(val));
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_CLS: Record<string, string> = {
  HELD:     'bg-[var(--warning)]/15 text-[var(--warning)]',
  RELEASED: 'bg-[var(--success)]/15 text-[var(--success)]',
  REFUNDED: 'bg-[var(--danger)]/10  text-[var(--danger)]',
};

export function PayoutsManager() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<TourPayment[]>([]);
  const [ready, setReady] = useState<ReadyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      const r = await fetch(`/api/admin/finance/payouts?${params}`);
      const j: unknown = await r.json();
      if (typeof j === 'object' && j !== null && 'success' in j && (j as { success: boolean }).success) {
        const d = (j as unknown as { data: { stats: Stats; payments: TourPayment[]; readyForPayout: ReadyGroup[] } }).data;
        setStats(d.stats);
        setPayments(d.payments);
        setReady(d.readyForPayout);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handlePayout(operatorId: string, operatorName: string) {
    const heldPayments = payments.filter(
      p => p.operator_id === operatorId && p.status === 'HELD'
    );
    if (heldPayments.length === 0) return;
    if (!confirm(`Выплатить ${formatRub(heldPayments.reduce((s, p) => s + parseFloat(p.net_amount), 0))} оператору ${operatorName}?`)) return;

    setProcessing(operatorId);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/admin/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId,
          paymentIds: heldPayments.map(p => p.id),
          periodStart: heldPayments.reduce((min, p) => p.booking_date < min ? p.booking_date : min, today),
          periodEnd: today,
        }),
      });
      const j: unknown = await res.json();
      if (typeof j === 'object' && j !== null && 'success' in j && (j as { success: boolean }).success) {
        fetchData();
      }
    } finally {
      setProcessing(null);
    }
  }

  const selectCls = 'px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  return (
    <div className="space-y-4">
      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Удержано',   val: stats.heldNet,         count: stats.heldCount,     icon: Clock,        cls: 'text-[var(--warning)]' },
            { label: 'Выплачено',  val: stats.releasedNet,     count: stats.releasedCount, icon: CheckCircle,  cls: 'text-[var(--success)]' },
            { label: 'Комиссия',   val: stats.totalCommission, count: null,                icon: Banknote,     cls: 'text-[var(--ocean)]'   },
            { label: 'Возвраты',   val: null,                  count: stats.refundedCount, icon: AlertCircle,  cls: 'text-[var(--danger)]'  },
          ].map(({ label, val, count, icon: Icon, cls }) => (
            <div key={label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${cls}`} />
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
              </div>
              {val !== null && <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{formatRub(val)}</p>}
              {count !== null && <p className="text-[10px] text-[var(--text-muted)]">{count} платежей</p>}
            </div>
          ))}
        </div>
      )}

      {/* Готовы к выплате */}
      {ready.length > 0 && (
        <div className="bg-[var(--success)]/5 border border-[var(--success)]/20 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--success)]/20">
            <p className="text-xs font-medium text-[var(--success)]">Готовы к выплате ({ready.length} оператора)</p>
          </div>
          <div className="divide-y divide-[var(--success)]/10">
            {ready.map(g => (
              <div key={g.operator_id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">{g.operator_name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{g.count} платежей · {formatRub(g.total_net)}</p>
                </div>
                <button
                  onClick={() => handlePayout(g.operator_id, g.operator_name)}
                  disabled={processing === g.operator_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  {processing === g.operator_id ? 'Обработка...' : 'Выплатить'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">Все платежи ({payments.length})</p>
        <select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Все статусы</option>
          <option value="held">Удержано</option>
          <option value="released">Выплачено</option>
          <option value="refunded">Возвраты</option>
        </select>
      </div>

      {/* Таблица платежей */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)]">Оператор / тур</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)]">Турист</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)]">Retail</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)]">Net</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)]">Комиссия</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)]">Статус</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)]">Выплата после</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {payments.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">Платежей нет</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[var(--text-primary)] truncate max-w-[160px]">{p.operator_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[160px]">{p.tour_title}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                      <p>{p.tourist_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{formatDate(p.booking_date)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[var(--text-primary)]">{formatRub(p.retail_amount)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[var(--success)]">{formatRub(p.net_amount)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[var(--text-muted)]">
                      {formatRub(p.commission_amount)}
                      <span className="block text-[9px]">{p.commission_rate}%</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_CLS[p.status] ?? ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                      {p.released_at ? formatDate(p.released_at) : formatDate(p.release_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
