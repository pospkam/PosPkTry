'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, FileText, DollarSign, Settings, CheckCircle, Clock, TrendingUp, Package, Map, Wrench, AlertCircle, ArrowRight, Sparkles, Star } from 'lucide-react';

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
      gradient: 'from-violet-400 via-purple-500 to-fuchsia-500',
      badge: data ? formatNumber(data.metrics.activeUsers.value) : null
    },
    {
      icon: Map,
      title: 'Туры',
      description: 'Модерация контента',
      link: '/hub/admin/content/tours',
      gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
      badge: null
    },
    {
      icon: Package,
      title: 'Партнёры',
      description: 'Верификация',
      link: '/hub/admin/content/partners',
      gradient: 'from-blue-400 via-indigo-500 to-purple-500',
      badge: null
    },
    {
      icon: FileText,
      title: 'Отзывы',
      description: 'Модерация',
      link: '/hub/admin/content/reviews',
      gradient: 'from-amber-400 via-orange-500 to-red-500',
      badge: null
    },
    {
      icon: DollarSign,
      title: 'Финансы',
      description: 'Транзакции',
      link: '/hub/admin/finance',
      gradient: 'from-pink-400 via-rose-500 to-red-500',
      badge: data ? formatCurrency(data.metrics.totalRevenue.value) : null
    },
    {
      icon: Settings,
      title: 'Настройки',
      description: 'Конфигурация',
      link: '/hub/admin/settings',
      gradient: 'from-slate-400 via-gray-500 to-zinc-500',
      badge: null
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,168,212,0.3),transparent_50%)]"></div>
        
        <div className="relative min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto"></div>
              <Sparkles className="w-10 h-10 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Загрузка данных...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen relative overflow-hidden flex items-center justify-center p-6">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.3),transparent_50%)]"></div>
        
        <div className="relative max-w-md w-full backdrop-blur-2xl bg-white/70 rounded-3xl shadow-2xl border border-white/60 p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/50">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Ошибка загрузки
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all transform hover:scale-105"
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
      gradient: 'from-violet-400 via-purple-500 to-fuchsia-500',
      trend: data.metrics.activeUsers.trend
    },
    { 
      icon: FileText, 
      label: 'Бронирования', 
      value: formatNumber(data.metrics.totalBookings.value),
      change: data.metrics.totalBookings.change.toFixed(1),
      gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
      trend: data.metrics.totalBookings.trend
    },
    { 
      icon: DollarSign, 
      label: 'Выручка', 
      value: formatCurrency(data.metrics.totalRevenue.value),
      change: data.metrics.totalRevenue.change.toFixed(1),
      gradient: 'from-pink-400 via-rose-500 to-red-500',
      trend: data.metrics.totalRevenue.trend
    },
    { 
      icon: TrendingUp, 
      label: 'Конверсия', 
      value: `${data.metrics.conversionRate.value.toFixed(1)}%`,
      change: data.metrics.conversionRate.change.toFixed(1),
      gradient: 'from-amber-400 via-orange-500 to-red-500',
      trend: data.metrics.conversionRate.trend
    },
  ];

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.15),transparent_50%)]"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,168,212,0.15),transparent_50%)]"></div>
      
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <div className="relative backdrop-blur-xl bg-black/30 border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                  <Shield className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Панель администратора
                </h1>
                <p className="text-gray-300 mt-1 font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  Kamchatour Hub · Control Center
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="px-6 py-3 backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl transition-all font-bold text-white shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🔄 Обновить
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-2xl transition-all font-bold shadow-xl shadow-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/70 transform hover:scale-105"
              >
                ← Выход
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Glass Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.trend === 'up';
            
            return (
              <div
                key={index}
                className="group relative backdrop-blur-2xl bg-black/40 rounded-3xl p-6 border border-white/30 hover:bg-black/50 transition-all duration-500 hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-2xl"
              >
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500`}></div>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                    {stat.change !== '0.0' && (
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {isPositive ? '↑' : '↓'} {Math.abs(parseFloat(stat.change))}%
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm font-semibold mb-2">{stat.label}</p>
                  <p className="text-3xl font-black text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Tours - Glass Card */}
        {data.charts.topTours && data.charts.topTours.length > 0 && (
          <div className="backdrop-blur-2xl bg-white/60 rounded-3xl border border-white/80 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-b border-white/60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Топ туры
                </h2>
              </div>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {data.charts.topTours.map((tour, index) => (
                  <div
                    key={tour.id}
                    className="group flex items-center justify-between p-5 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg group-hover:text-violet-300 transition-colors">{tour.title}</p>
                        <p className="text-gray-400 text-sm">{tour.bookings} бронирований</p>
                      </div>
                    </div>
                    <p className="text-2xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                      {formatCurrency(tour.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Admin Tools - Premium Glass Grid */}
        <div className="backdrop-blur-2xl bg-white/60 rounded-3xl border border-white/80 shadow-2xl overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-b border-white/60">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
                <Wrench className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Инструменты администратора
              </h2>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminTools.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={index}
                    onClick={() => router.push(tool.link)}
                    className="group relative backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/30 hover:bg-white/20 transition-all duration-500 text-left overflow-hidden hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-2xl"
                  >
                    {/* Gradient glow on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500`}></div>
                    
                    <div className="relative">
                      <div className="flex items-start justify-between mb-5">
                        <div className={`w-16 h-16 bg-gradient-to-br ${tool.gradient} rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                          <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                        </div>
                        {tool.badge && (
                          <span className="px-4 py-2 backdrop-blur-xl bg-white/20 text-white text-sm font-bold rounded-xl shadow-lg">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-white mb-2">
                        {tool.title}
                      </h3>
                      <p className="text-gray-300 text-sm mb-5 font-medium">
                        {tool.description}
                      </p>
                      <div className="flex items-center gap-2 text-violet-400 group-hover:text-fuchsia-300 transition-colors font-bold">
                        <span>Перейти</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {data.recentActivities && data.recentActivities.length > 0 && (
          <div className="backdrop-blur-2xl bg-white/60 rounded-3xl border border-white/80 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-b border-white/60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Clock className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Последняя активность
                </h2>
              </div>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {data.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-5 p-5 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all shadow-lg hover:shadow-xl"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold">{activity.title}</p>
                      <p className="text-gray-300 text-sm">{activity.description}</p>
                      <p className="text-gray-500 text-xs mt-1">
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
