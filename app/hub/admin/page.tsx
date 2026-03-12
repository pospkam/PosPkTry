'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, FileText, DollarSign, Settings,
  CheckCircle, Clock, TrendingUp, TrendingDown,
  Package, Map, Wrench, AlertCircle, ArrowUpRight,
  RefreshCw, AlertTriangle, BarChart3,
} from 'lucide-react';

interface MetricItem {
  value: number;
  change: number;
  trend: string;
}

interface DashboardData {
  metrics: {
    totalRevenue: MetricItem;
    totalBookings: MetricItem;
    activeUsers: MetricItem;
    conversionRate: MetricItem;
  };
  charts: {
    topTours: Array<{ id: string; title: string; bookings: number; revenue: number }>;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
  pendingTours?: number;
  pendingPartners?: number;
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн ₽`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} тыс ₽`;
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value);
}

function TrendBadge({ change, trend }: { change: number; trend: string }) {
  if (trend === 'neutral' || change === 0) return null;
  const up = trend === 'up';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
    }`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/dashboard?period=30');
      const result = await response.json();
      if (!result.success) throw new Error(result.error ?? 'Ошибка загрузки данных');
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const adminTools = [
    { icon: Users, label: 'Пользователи', href: '/hub/admin/users', badge: data ? formatNumber(data.metrics.activeUsers.value) : null, color: 'text-violet-600 bg-violet-50' },
    { icon: Map, label: 'Туры', href: '/hub/admin/content/tours', badge: data?.pendingTours && data.pendingTours > 0 ? String(data.pendingTours) : null, badgeAlert: true, color: 'text-sky-600 bg-sky-50' },
    { icon: Package, label: 'Партнёры', href: '/hub/admin/content/partners', badge: data?.pendingPartners && data.pendingPartners > 0 ? String(data.pendingPartners) : null, badgeAlert: true, color: 'text-amber-600 bg-amber-50' },
    { icon: FileText, label: 'Отзывы', href: '/hub/admin/content/reviews', badge: null, color: 'text-orange-600 bg-orange-50' },
    { icon: DollarSign, label: 'Финансы', href: '/hub/admin/finance', badge: null, color: 'text-emerald-600 bg-emerald-50' },
    { icon: Settings, label: 'Настройки', href: '/hub/admin/settings', badge: null, color: 'text-slate-600 bg-slate-100' },
  ];

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-7 w-32 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-56 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 rounded mb-4" />
              <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl h-72 animate-pulse" />
          <div className="bg-white border border-slate-200 rounded-xl h-72 animate-pulse" />
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="p-6 lg:p-8 bg-slate-50 min-h-screen flex items-start justify-start">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Ошибка загрузки</h2>
          </div>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      icon: Users,
      label: 'Пользователи',
      value: formatNumber(data.metrics.activeUsers.value),
      metric: data.metrics.activeUsers,
      accent: 'border-l-violet-500',
      iconClass: 'text-violet-500 bg-violet-50',
    },
    {
      icon: FileText,
      label: 'Бронирования',
      value: formatNumber(data.metrics.totalBookings.value),
      metric: data.metrics.totalBookings,
      accent: 'border-l-sky-500',
      iconClass: 'text-sky-500 bg-sky-50',
    },
    {
      icon: DollarSign,
      label: 'Выручка',
      value: formatCurrency(data.metrics.totalRevenue.value),
      metric: data.metrics.totalRevenue,
      accent: 'border-l-emerald-500',
      iconClass: 'text-emerald-500 bg-emerald-50',
    },
    {
      icon: BarChart3,
      label: 'Конверсия',
      value: `${data.metrics.conversionRate.value.toFixed(1)}%`,
      metric: data.metrics.conversionRate,
      accent: 'border-l-amber-500',
      iconClass: 'text-amber-500 bg-amber-50',
    },
  ];

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">

      {/* Заголовок страницы */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Обзор</h1>
            <p className="text-xs text-slate-500">Административная панель · последние 30 дней</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* Алерты — ожидающие модерации */}
      {((data.pendingTours ?? 0) > 0 || (data.pendingPartners ?? 0) > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {(data.pendingTours ?? 0) > 0 && (
            <button
              onClick={() => router.push('/hub/admin/content/tours')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {data.pendingTours} туров ожидают модерации
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
            </button>
          )}
          {(data.pendingPartners ?? 0) > 0 && (
            <button
              onClick={() => router.push('/hub/admin/content/partners')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-blue-500" />
              {data.pendingPartners} партнёров ожидают верификации
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
            </button>
          )}
        </div>
      )}

      {/* KPI карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`bg-white border-l-4 ${kpi.accent} border border-slate-200 rounded-xl p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.iconClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <TrendBadge change={kpi.metric.change} trend={kpi.metric.trend} />
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-tight">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Основная сетка: топ туры + активность */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Топ туры */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Топ туры</h2>
            <span className="ml-auto text-xs text-slate-400">за 30 дней</span>
          </div>
          {data.charts.topTours.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Нет данных</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-8">#</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Тур</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Броней</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Выручка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.charts.topTours.map((tour, idx) => (
                  <tr key={tour.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-3 py-3.5">
                      <span className="text-slate-800 font-medium line-clamp-1">{tour.title}</span>
                    </td>
                    <td className="px-3 py-3.5 text-right text-slate-600">{tour.bookings}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-slate-800">
                      {formatCurrency(tour.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Последняя активность */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Активность</h2>
            <span className="ml-auto text-xs text-slate-400">24 ч</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {data.recentActivities.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">Нет активности</div>
            ) : (
              data.recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{act.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(act.timestamp).toLocaleString('ru-RU', {
                        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Инструменты администратора */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Управление</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {adminTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                onClick={() => router.push(tool.href)}
                className="group relative bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all flex flex-col items-center gap-2.5 text-center"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tool.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 leading-tight">{tool.label}</span>
                {tool.badge && (
                  <span className={`absolute top-2.5 right-2.5 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                    tool.badgeAlert
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
