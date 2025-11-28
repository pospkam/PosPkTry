'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, FileText, DollarSign, Settings, CheckCircle, XCircle, Clock, TrendingUp, Package, Map, Wrench, AlertCircle } from 'lucide-react';

interface Metrics {
  totalRevenue: { value: number; change: number; trend: string };
  totalBookings: { value: number; change: number; trend: string };
  activeUsers: { value: number; change: number; trend: string };
  conversionRate: { value: number; change: number; trend: string };
}

interface DashboardData {
  metrics: Metrics;
  charts: {
    topTours: Array<{ id: string; title: string; bookings: number; revenue: number }>;
  };
  recentActivities: Array<any>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard?period=30');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка загрузки данных');
      }
      
      setData(result.data);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value);
  };

  const adminTools = [
    {
      icon: Users,
      title: 'Управление пользователями',
      description: 'Просмотр, редактирование и блокировка',
      link: '/hub/admin/users',
      color: 'from-blue-400 to-cyan-500',
      badge: data ? formatNumber(data.metrics.activeUsers.value) : '...'
    },
    {
      icon: Map,
      title: 'Модерация туров',
      description: 'Проверка и одобрение новых туров',
      link: '/hub/admin/content/tours',
      color: 'from-green-400 to-emerald-500',
      badge: null
    },
    {
      icon: Package,
      title: 'Партнёры',
      description: 'Управление партнёрами платформы',
      link: '/hub/admin/content/partners',
      color: 'from-purple-400 to-pink-500',
      badge: null
    },
    {
      icon: FileText,
      title: 'Модерация отзывов',
      description: 'Проверка и модерация отзывов',
      link: '/hub/admin/content/reviews',
      color: 'from-orange-400 to-red-500',
      badge: null
    },
    {
      icon: DollarSign,
      title: 'Финансы',
      description: 'Транзакции, выплаты, статистика',
      link: '/hub/admin/finance',
      color: 'from-amber-400 to-yellow-500',
      badge: data ? formatCurrency(data.metrics.totalRevenue.value) : '...'
    },
    {
      icon: Settings,
      title: 'Настройки системы',
      description: 'Конфигурация платформы',
      link: '/hub/admin/settings',
      color: 'from-gray-400 to-slate-500',
      badge: null
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="text-white/70">Загрузка данных...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-transparent text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-500/10 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Ошибка загрузки</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all"
          >
            Попробовать снова
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const stats = [
    { 
      icon: Users, 
      label: 'Активных пользователей', 
      value: formatNumber(data.metrics.activeUsers.value),
      change: `${data.metrics.activeUsers.change > 0 ? '+' : ''}${data.metrics.activeUsers.change.toFixed(1)}%`,
      color: 'from-blue-400 to-cyan-500',
      trend: data.metrics.activeUsers.trend
    },
    { 
      icon: FileText, 
      label: 'Бронирований', 
      value: formatNumber(data.metrics.totalBookings.value),
      change: `${data.metrics.totalBookings.change > 0 ? '+' : ''}${data.metrics.totalBookings.change.toFixed(1)}%`,
      color: 'from-green-400 to-emerald-500',
      trend: data.metrics.totalBookings.trend
    },
    { 
      icon: DollarSign, 
      label: 'Выручка (30 дней)', 
      value: formatCurrency(data.metrics.totalRevenue.value),
      change: `${data.metrics.totalRevenue.change > 0 ? '+' : ''}${data.metrics.totalRevenue.change.toFixed(1)}%`,
      color: 'from-amber-400 to-orange-500',
      trend: data.metrics.totalRevenue.trend
    },
    { 
      icon: CheckCircle, 
      label: 'Конверсия', 
      value: `${data.metrics.conversionRate.value.toFixed(1)}%`,
      change: `${data.metrics.conversionRate.change > 0 ? '+' : ''}${data.metrics.conversionRate.change.toFixed(1)}%`,
      color: 'from-purple-400 to-pink-500',
      trend: data.metrics.conversionRate.trend
    },
  ];

  return (
    <main className="min-h-screen bg-transparent text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border-b border-white/20 p-6 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/50">
                <Shield className="w-9 h-9 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white">
                  Панель администратора
                </h1>
                <p className="text-white/70 mt-1">
                  Kamchatour Hub Control Center
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-white font-semibold"
              >
                🔄 Обновить
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-white font-semibold"
              >
                ← Назад
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Grid - РЕАЛЬНЫЕ ДАННЫЕ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.trend === 'up';
            const isNegative = stat.trend === 'down';
            
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:scale-105 transition-transform shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-sm font-bold flex items-center gap-1 ${
                    isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {isPositive ? '↑' : isNegative ? '↓' : '→'}
                    {stat.change}
                  </span>
                </div>
                <p className="text-white/70 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Top Tours - РЕАЛЬНЫЕ ДАННЫЕ */}
        {data.charts.topTours && data.charts.topTours.length > 0 && (
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Топ туры
            </h2>
            <div className="space-y-3">
              {data.charts.topTours.map((tour, index) => (
                <div
                  key={tour.id}
                  className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/15 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{tour.title}</p>
                      <p className="text-white/60 text-sm">{tour.bookings} бронирований</p>
                    </div>
                  </div>
                  <p className="text-white font-bold text-lg">{formatCurrency(tour.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Tools Grid */}
        <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Wrench className="w-6 h-6" />
            Инструменты администратора
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <button
                  key={index}
                  onClick={() => router.push(tool.link)}
                  className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:scale-105 hover:shadow-2xl transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    {tool.badge && (
                      <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {tool.title}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {tool.description}
                  </p>
                  <div className="mt-4 text-white/40 group-hover:text-white/80 transition-colors text-sm flex items-center gap-1">
                    Перейти
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - РЕАЛЬНЫЕ ДАННЫЕ */}
        {data.recentActivities && data.recentActivities.length > 0 && (
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Последняя активность
            </h2>
            <div className="space-y-3">
              {data.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/15 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-green-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">{activity.title}</p>
                    <p className="text-white/60 text-xs">{activity.description}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(activity.timestamp).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
