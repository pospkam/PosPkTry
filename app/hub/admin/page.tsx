'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, FileText, DollarSign, Settings, CheckCircle, Clock, TrendingUp, Package, Map, Wrench, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

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
      title: 'Пользователи',
      description: 'Управление и аналитика',
      link: '/hub/admin/users',
      color: 'from-violet-500 to-purple-600',
      badge: data ? formatNumber(data.metrics.activeUsers.value) : null
    },
    {
      icon: Map,
      title: 'Туры',
      description: 'Модерация контента',
      link: '/hub/admin/content/tours',
      color: 'from-emerald-500 to-teal-600',
      badge: null
    },
    {
      icon: Package,
      title: 'Партнёры',
      description: 'Верификация и управление',
      link: '/hub/admin/content/partners',
      color: 'from-blue-500 to-cyan-600',
      badge: null
    },
    {
      icon: FileText,
      title: 'Отзывы',
      description: 'Модерация отзывов',
      link: '/hub/admin/content/reviews',
      color: 'from-amber-500 to-orange-600',
      badge: null
    },
    {
      icon: DollarSign,
      title: 'Финансы',
      description: 'Транзакции и выплаты',
      link: '/hub/admin/finance',
      color: 'from-rose-500 to-pink-600',
      badge: data ? formatCurrency(data.metrics.totalRevenue.value) : null
    },
    {
      icon: Settings,
      title: 'Настройки',
      description: 'Конфигурация системы',
      link: '/hub/admin/settings',
      color: 'from-slate-500 to-gray-600',
      badge: null
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
            <Sparkles className="w-8 h-8 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Загрузка данных...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ошибка загрузки</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/50 transition-all"
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
      label: 'Пользователи', 
      value: formatNumber(data.metrics.activeUsers.value),
      change: data.metrics.activeUsers.change.toFixed(1),
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-50',
      trend: data.metrics.activeUsers.trend
    },
    { 
      icon: FileText, 
      label: 'Бронирования', 
      value: formatNumber(data.metrics.totalBookings.value),
      change: data.metrics.totalBookings.change.toFixed(1),
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50',
      trend: data.metrics.totalBookings.trend
    },
    { 
      icon: DollarSign, 
      label: 'Выручка', 
      value: formatCurrency(data.metrics.totalRevenue.value),
      change: data.metrics.totalRevenue.change.toFixed(1),
      color: 'from-rose-500 to-pink-600',
      bgColor: 'bg-rose-50',
      trend: data.metrics.totalRevenue.trend
    },
    { 
      icon: TrendingUp, 
      label: 'Конверсия', 
      value: `${data.metrics.conversionRate.value.toFixed(1)}%`,
      change: data.metrics.conversionRate.change.toFixed(1),
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50',
      trend: data.metrics.conversionRate.trend
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Elegant Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Панель администратора
                </h1>
                <p className="text-slate-500 mt-1 font-medium">
                  Kamchatour Hub · Control Center
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-semibold border border-slate-200"
              >
                🔄 Обновить
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all font-semibold shadow-lg shadow-slate-900/20"
              >
                ← Выход
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Elegant Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.trend === 'up';
            const isNegative = stat.trend === 'down';
            
            return (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} strokeWidth={2.5} />
                  </div>
                  {stat.change !== '0.0' && (
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isPositive ? 'bg-emerald-50 text-emerald-700' : 
                      isNegative ? 'bg-red-50 text-red-700' : 
                      'bg-slate-50 text-slate-700'
                    }`}>
                      {isPositive ? '↑' : isNegative ? '↓' : '→'}
                      {Math.abs(parseFloat(stat.change))}%
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Top Tours - Elegant Card */}
        {data.charts.topTours && data.charts.topTours.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Топ туры</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {data.charts.topTours.map((tour, index) => (
                  <div
                    key={tour.id}
                    className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-slate-900 font-semibold group-hover:text-violet-600 transition-colors">{tour.title}</p>
                        <p className="text-slate-500 text-sm">{tour.bookings} бронирований</p>
                      </div>
                    </div>
                    <p className="text-slate-900 font-bold text-lg">{formatCurrency(tour.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Admin Tools - Premium Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-sm">
                <Wrench className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Инструменты администратора</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminTools.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={index}
                    onClick={() => router.push(tool.link)}
                    className="group relative bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 text-left overflow-hidden"
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                    
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all`}>
                          <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                        </div>
                        {tool.badge && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {tool.title}
                      </h3>
                      <p className="text-slate-500 text-sm mb-4">
                        {tool.description}
                      </p>
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-violet-600 transition-colors text-sm font-semibold">
                        <span>Перейти</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity - Elegant List */}
        {data.recentActivities && data.recentActivities.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Clock className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Последняя активность</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {data.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 text-sm font-semibold">{activity.title}</p>
                      <p className="text-slate-600 text-xs">{activity.description}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {new Date(activity.timestamp).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
