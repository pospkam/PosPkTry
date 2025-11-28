'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, FileText, DollarSign, Settings, CheckCircle, XCircle, Clock, TrendingUp, Package, Map, Home, Wrench } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();

  const stats = [
    { 
      icon: Users, 
      label: 'Всего пользователей', 
      value: '1,234', 
      change: '+12%', 
      color: 'from-blue-400 to-cyan-500' 
    },
    { 
      icon: FileText, 
      label: 'Активных туров', 
      value: '87', 
      change: '+5%', 
      color: 'from-green-400 to-emerald-500' 
    },
    { 
      icon: DollarSign, 
      label: 'Выручка (месяц)', 
      value: '₽2.4M', 
      change: '+23%', 
      color: 'from-amber-400 to-orange-500' 
    },
    { 
      icon: CheckCircle, 
      label: 'Завершённых заказов', 
      value: '456', 
      change: '+18%', 
      color: 'from-purple-400 to-pink-500' 
    },
  ];

  const adminTools = [
    {
      icon: Users,
      title: 'Управление пользователями',
      description: 'Просмотр, редактирование и блокировка',
      link: '/hub/admin/users',
      color: 'from-blue-400 to-cyan-500',
      badge: '1,234'
    },
    {
      icon: Map,
      title: 'Модерация туров',
      description: 'Проверка и одобрение новых туров',
      link: '/hub/admin/content/tours',
      color: 'from-green-400 to-emerald-500',
      badge: '12'
    },
    {
      icon: Package,
      title: 'Партнёры',
      description: 'Управление партнёрами платформы',
      link: '/hub/admin/content/partners',
      color: 'from-purple-400 to-pink-500',
      badge: '45'
    },
    {
      icon: FileText,
      title: 'Модерация отзывов',
      description: 'Проверка и модерация отзывов',
      link: '/hub/admin/content/reviews',
      color: 'from-orange-400 to-red-500',
      badge: '8'
    },
    {
      icon: DollarSign,
      title: 'Финансы',
      description: 'Транзакции, выплаты, статистика',
      link: '/hub/admin/finance',
      color: 'from-amber-400 to-yellow-500',
      badge: '₽2.4M'
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

  const recentActivity = [
    { 
      icon: CheckCircle, 
      text: 'Новый пользователь зарегистрирован', 
      time: '5 мин назад', 
      color: 'text-green-400' 
    },
    { 
      icon: FileText, 
      text: 'Тур "Вулкан Мутновский" требует модерации', 
      time: '15 мин назад', 
      color: 'text-orange-400' 
    },
    { 
      icon: DollarSign, 
      text: 'Выплата партнёру ₽45,000', 
      time: '1 час назад', 
      color: 'text-blue-400' 
    },
    { 
      icon: XCircle, 
      text: 'Отзыв отклонён (нарушение правил)', 
      time: '2 часа назад', 
      color: 'text-red-400' 
    },
    { 
      icon: Users, 
      text: 'Новый партнёр одобрен', 
      time: '3 часа назад', 
      color: 'text-purple-400' 
    },
  ];

  const pendingTasks = [
    { title: 'Туры на модерации', count: 12, color: 'bg-orange-500' },
    { title: 'Ожидают верификации', count: 8, color: 'bg-blue-500' },
    { title: 'Жалобы на рассмотрении', count: 3, color: 'bg-red-500' },
    { title: 'Запросы на выплату', count: 5, color: 'bg-green-500' },
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
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-white font-semibold"
            >
              ← Назад
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 hover:scale-105 transition-transform shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-green-400 text-sm font-bold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {stat.change}
                  </span>
                </div>
                <p className="text-white/70 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Pending Tasks */}
        <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Требуют внимания
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pendingTasks.map((task, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="text-white/80 text-sm">{task.title}</p>
                  <div className={`${task.color} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                    {task.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Последняя активность
          </h2>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/15 transition-all"
                >
                  <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center ${activity.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.text}</p>
                    <p className="text-white/50 text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => router.push('/hub/admin/content/tours')}
            className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold text-white mb-2">
              12 туров на модерации
            </h3>
            <p className="text-white/60 text-sm">
              Требуется проверка и одобрение
            </p>
          </button>

          <button
            onClick={() => router.push('/hub/admin/finance')}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-lg font-bold text-white mb-2">
              ₽245,000 к выплате
            </h3>
            <p className="text-white/60 text-sm">
              5 запросов от партнёров
            </p>
          </button>

          <button
            onClick={() => router.push('/hub/admin/settings')}
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="text-lg font-bold text-white mb-2">
              Настройки системы
            </h3>
            <p className="text-white/60 text-sm">
              Конфигурация и параметры
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}
