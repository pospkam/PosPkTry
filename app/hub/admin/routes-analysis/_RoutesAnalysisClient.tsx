'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin, TrendingUp, AlertTriangle, Users, DollarSign,
  Zap, Loader2, RefreshCw, Download, GripVertical,
} from 'lucide-react';

interface LocationAnalysis {
  location_id: string;
  location_name: string;
  location_type: string;
  zone: string;
  lat: number;
  lng: number;
  tours_count: number;
  active_tours: number;
  total_bookings: number;
  capacity_per_day: number;
  utilization_pct: number;
  difficulty_levels: string[];
  activity_types: string[];
  operators_count: number;
  avg_price: number;
  safety_alerts: string[];
  status: 'available' | 'crowded' | 'closed' | 'warning';
  recommendations: string[];
}

interface AnalysisResult {
  timestamp: string;
  total_locations: number;
  total_tours: number;
  total_bookings: number;
  locations: LocationAnalysis[];
  summary: {
    most_popular: string;
    most_crowded: string;
    most_expensive: string;
    needs_operators: string[];
    critical_alerts: string[];
  };
}

export default function RoutesAnalysisClient() {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'bookings' | 'utilization' | 'price'>('bookings');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/routes/analysis');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  if (!data) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Анализ маршрутов</h1>
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="ds-btn ds-btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Загрузка...' : 'Загрузить'}
          </button>
        </div>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        )}
      </div>
    );
  }

  const sorted = [...data.locations].sort((a, b) => {
    if (sortBy === 'bookings') return b.total_bookings - a.total_bookings;
    if (sortBy === 'utilization') return b.utilization_pct - a.utilization_pct;
    return b.avg_price - a.avg_price;
  });

  const filtered = filterStatus ? sorted.filter(l => l.status === filterStatus) : sorted;

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      available: 'bg-green-100 dark:bg-green-900/30 text-green-700',
      crowded: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700',
      closed: 'bg-red-100 dark:bg-red-900/30 text-red-700',
    };
    return map[status] || '';
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      available: '✅ Доступно',
      crowded: '⚠️ Перегружено',
      warning: '⚡ Внимание',
      closed: '🚫 Закрыто',
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Анализ маршрутов</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Связь туров с местами: популярность, вместимость, алерты
          </p>
        </div>
        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className="ds-btn ds-btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Мест', value: data.total_locations, icon: MapPin },
          { label: 'Туров', value: data.total_tours, icon: Zap },
          { label: 'Бронирований', value: data.total_bookings, icon: Users },
          { label: 'За месяц', value: '📈', icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Summary Insights */}
      {data.summary && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">📊 Итоги</p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-[var(--text-muted)]">Популярное:</span>
              <span className="ml-2 font-mono text-[var(--text-primary)]">{data.summary.most_popular}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Перегруженное:</span>
              <span className="ml-2 font-mono text-[var(--text-primary)]">{data.summary.most_crowded}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Дорогое:</span>
              <span className="ml-2 font-mono text-[var(--text-primary)]">{data.summary.most_expensive}</span>
            </div>
            {data.summary.critical_alerts.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-red-700 font-semibold text-xs mb-1">🚨 Критические алерты:</p>
                {data.summary.critical_alerts.map((a, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">{a}</p>
                ))}
              </div>
            )}
            {data.summary.needs_operators.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-blue-700 font-semibold text-xs mb-1">🆕 Ищем операторов:</p>
                {data.summary.needs_operators.map((p, i) => (
                  <p key={i} className="text-xs text-blue-600 dark:text-blue-400">{p}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters & Sort */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus(null)}
          className={`text-xs px-3 py-1.5 rounded ${filterStatus === null ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]'}`}
        >
          Все ({filtered.length})
        </button>
        {['available', 'crowded', 'warning', 'closed'].map(st => {
          const count = data.locations.filter(l => l.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`text-xs px-3 py-1.5 rounded ${filterStatus === st ? `${statusColor(st)}` : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]'}`}
            >
              {statusLabel(st)} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-1 flex gap-2">
        <label className="text-xs text-[var(--text-muted)]">Сортировка:</label>
        {(['bookings', 'utilization', 'price'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`text-xs px-2 py-1 rounded ${sortBy === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-primary)]'}`}
          >
            {s === 'bookings' && 'По бронированиям'}
            {s === 'utilization' && 'По загруженности'}
            {s === 'price' && 'По цене'}
          </button>
        ))}
      </div>

      {/* Locations Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
              <tr className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
                <th className="px-4 py-3 text-left">Место</th>
                <th className="px-4 py-3 text-center">Туры</th>
                <th className="px-4 py-3 text-center">Броня</th>
                <th className="px-4 py-3 text-center">Загру. %</th>
                <th className="px-4 py-3 text-center">Цена</th>
                <th className="px-4 py-3 text-center">Операторы</th>
                <th className="px-4 py-3 text-center">Статус</th>
                <th className="px-4 py-3 text-left">Рекомендации</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((loc, i) => (
                <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{loc.location_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{loc.location_type} · {loc.zone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-[var(--text-primary)]">
                      {loc.active_tours}/{loc.tours_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[var(--text-primary)]">
                    {loc.total_bookings}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-mono text-sm ${
                      loc.utilization_pct > 80 ? 'text-[var(--danger)]' :
                      loc.utilization_pct > 50 ? 'text-[var(--warning)]' :
                      'text-[var(--success)]'
                    }`}>
                      {loc.utilization_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[var(--text-primary)]">
                    {loc.avg_price}₽
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--text-primary)]">
                    {loc.operators_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded font-semibold ${statusColor(loc.status)}`}>
                      {statusLabel(loc.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[var(--text-muted)] max-w-xs">
                    {loc.recommendations.length > 0 ? (
                      <div className="space-y-0.5">
                        {loc.recommendations.slice(0, 2).map((r, j) => (
                          <p key={j}>{r}</p>
                        ))}
                        {loc.recommendations.length > 2 && <p className="text-[var(--text-muted)]">+{loc.recommendations.length - 2} ещё</p>}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-[var(--text-muted)] text-center">
        Обновлено: {new Date(data.timestamp).toLocaleString('ru-RU')}
      </div>
    </div>
  );
}
