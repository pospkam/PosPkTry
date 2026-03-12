'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, AlertCircle, CheckCircle, User, FileText, DollarSign } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof CheckCircle; color: string }> = {
  booking: { icon: CheckCircle, color: 'text-[var(--success)]' },
  user: { icon: User, color: 'text-[var(--accent)]' },
  review: { icon: FileText, color: 'text-[var(--warning)]' },
  payment: { icon: DollarSign, color: 'text-[var(--success)]' },
};

export default function AdminActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard?period=7');
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setActivities(json.data?.recentActivities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-5 w-36 bg-[var(--bg-hover)] rounded animate-pulse" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
            <span className="text-sm text-[var(--text-primary)]">Ошибка</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">{error}</p>
          <button onClick={fetchData} className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Журнал активности</h1>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Обновить
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <Activity className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text-muted)]">Нет активности за последние 24 часа</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="px-4 py-2.5 text-left font-medium w-10"></th>
                <th className="py-2.5 text-left font-medium">Событие</th>
                <th className="py-2.5 text-left font-medium">Описание</th>
                <th className="py-2.5 text-right font-medium pr-4">Время</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {activities.map(act => {
                const cfg = TYPE_CONFIG[act.type] ?? TYPE_CONFIG.booking;
                const Icon = cfg.icon;
                return (
                  <tr key={act.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </td>
                    <td className="py-3 text-[var(--text-primary)]">{act.title}</td>
                    <td className="py-3 text-[var(--text-secondary)] truncate max-w-[280px]">{act.description}</td>
                    <td className="py-3 text-right pr-4 text-[var(--text-muted)] font-mono whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleString('ru-RU', {
                        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-[var(--text-muted)]">
        Показаны последние действия за 24 часа. Полный журнал аудита — в разработке.
      </p>

    </div>
  );
}
