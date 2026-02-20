'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { Shield, Users, FileText, DollarSign, Settings, CheckCircle, Clock, TrendingUp, TrendingDown, Package, Map, Wrench, AlertCircle, ArrowRight, Sparkles, Star, RefreshCw } from 'lucide-react';

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
      badge: data?.pendingTours && data.pendingTours > 0 ? data.pendingTours : null
    },
    {
      icon: Package,
      title: 'Партнёры',
      description: 'Верификация',
      link: '/hub/admin/content/partners',
      gradient: 'from-blue-400 via-indigo-500 to-purple-500',
      badge: data?.pendingPartners && data.pendingPartners > 0 ? data.pendingPartners : null
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
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900"></div>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.15),transparent_50%)]"></div>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,168,212,0.15),transparent_50%)]"></div>
        
        <div className="relative min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin mx-auto"></div>
              <Sparkles className="w-10 h-10 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-xl font-semibold text-white">
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
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900"></div>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.15),transparent_50%)]"></div>
        
        <div className="relative max-w-md w-full backdrop-blur-2xl bg-black/40 rounded-3xl shadow-2xl border border-white/30 p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <AlertCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-white mb-4">Ошибка загрузки</h2>
          <p className="text-gray-300 mb-6">{error}</p>
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
      <AdminNav />
      {/* КАМЧАТКА: Фоновое изображение вулканов */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#2C1810] via-[#1a2634] to-[#0f1821]"></div>
      <div 
        className="fixed inset-0 opacity-20 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="volcano" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23DC143C;stop-opacity:0.3"/><stop offset="100%" style="stop-color:%23FF4500;stop-opacity:0.1"/></linearGradient></defs><polygon points="200,800 400,200 600,800" fill="url(%23volcano)"/><polygon points="700,800 900,150 1100,800" fill="url(%23volcano)" opacity="0.8"/><circle cx="400" cy="180" r="30" fill="%23FF6347" opacity="0.6"/><circle cx="900" cy="130" r="40" fill="%23FF4500" opacity="0.5"/></svg>')`,
          filter: 'blur(2px)'
        }}
      ></div>
      
      {/* Камчатские цвета: охра, лава, океан, мох */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(205,133,63,0.15),transparent_50%)]"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,144,255,0.1),transparent_50%)]"></div>
      
      {/* Плавающие частицы - вулканический пепел */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#CD853F]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#DC143C]/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#556B2F]/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <div className="relative backdrop-blur-xl bg-gradient-to-r from-[#2C1810]/40 via-[#1a2634]/40 to-[#2C1810]/40 border-b border-[#CD853F]/30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#DC143C] to-[#FF4500] rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-[#DC143C] via-[#FF4500] to-[#CD853F] rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                  <Shield className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-[#6B8E23] to-[#556B2F] rounded-full border-4 border-[#CD853F] shadow-lg animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-[#CD853F] via-[#DAA520] to-[#FF6347] bg-clip-text text-transparent drop-shadow-lg">
                  Панель администратора Камчатки
                </h1>
                <p className="text-[#E8D4B0] mt-1 font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#FF4500] fill-[#FF4500]" />
                  Kamchatour Hub · Вулканы, Океан, Приключения
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="px-6 py-3 backdrop-blur-xl bg-[#556B2F]/20 hover:bg-[#6B8E23]/30 border border-[#CD853F]/50 rounded-2xl transition-all font-bold text-[#E8D4B0] shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Обновить
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gradient-to-r from-[#DC143C] to-[#FF4500] hover:from-[#FF4500] hover:to-[#FF6347] text-white rounded-2xl transition-all font-bold shadow-xl shadow-[#DC143C]/50 hover:shadow-2xl hover:shadow-[#FF4500]/70 transform hover:scale-105"
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
          {stats.map((stat) => {
            const Icon = stat.icon;
            const isPositive = stat.trend === 'up';
            
            return (
              <div
                key={stat.label}
                className="group relative backdrop-blur-2xl bg-gradient-to-br from-[#2C1810]/60 to-[#1a2634]/60 rounded-3xl p-6 border border-[#CD853F]/40 hover:border-[#FF4500]/60 hover:bg-[#2C1810]/70 transition-all duration-500 hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-2xl hover:shadow-[#DC143C]/30"
              >
                {/* Glow effect - Камчатка */}
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}></div>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                    {stat.change !== '0.0' && (
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${
                        isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {Math.abs(parseFloat(stat.change))}%
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
          <div className="backdrop-blur-2xl bg-black/40 rounded-3xl border border-white/30 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-b border-white/20">
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
                {data.charts.topTours.map((tour, tourIdx) => (
                  <div
                    key={tour.id}
                    className="group flex items-center justify-between p-5 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
                        {tourIdx + 1}
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
        <div className="backdrop-blur-2xl bg-black/40 rounded-3xl border border-white/30 shadow-2xl overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-b border-white/20">
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
              {adminTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
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
          <div className="backdrop-blur-2xl bg-black/40 rounded-3xl border border-white/30 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-b border-white/20">
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
