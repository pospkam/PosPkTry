'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Protected } from '@/components/Protected';
import { GearProviderNav } from '@/components/gear-provider/GearProviderNav';

export const metadata = {
  title: 'Панель поставщика снаряжения | Kamhub',
  description: 'Управление арендой снаряжения',
};

import { LoadingSpinner } from '@/components/admin/shared';
import { Package, Calendar, DollarSign, Star, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardMetrics {
  totalItems: number;
  availableItems: number;
  activeRentals: number;
  totalRevenue: number;
  averageRating: number;
  pendingReturns: number;
}

export default function GearProviderDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalItems: 0,
    availableItems: 0,
    activeRentals: 0,
    totalRevenue: 0,
    averageRating: 0,
    pendingReturns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/gear-provider/dashboard');
      const data = await response.json();
      if (data.success && data.data?.metrics) {
        setMetrics(data.data.metrics);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Protected roles={['gear', 'operator', 'admin']}>
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <LoadingSpinner message="Загрузка dashboard..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['gear', 'operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <GearProviderNav />
        
        <div className="bg-white/15 border-b border-white/15 p-6">
          <h1 className="text-3xl font-black text-white">Dashboard проката</h1>
          <p className="text-white/70">Управление снаряжением и арендой</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              icon={Package}
              label="Всего позиций"
              value={metrics.totalItems}
              subValue={`${metrics.availableItems} доступно`}
              color="text-premium-gold"
            />
            <MetricCard
              icon={Calendar}
              label="Активные аренды"
              value={metrics.activeRentals}
              color="text-blue-400"
            />
            <MetricCard
              icon={AlertCircle}
              label="Ожидают возврата"
              value={metrics.pendingReturns}
              color="text-orange-400"
            />
            <MetricCard
              icon={DollarSign}
              label="Доход за месяц"
              value={`${metrics.totalRevenue.toLocaleString('ru-RU')} ₽`}
              color="text-green-400"
            />
            <MetricCard
              icon={Star}
              label="Средний рейтинг"
              value={metrics.averageRating.toFixed(1)}
              color="text-yellow-400"
            />
            <MetricCard
              icon={TrendingUp}
              label="Загрузка"
              value={metrics.totalItems > 0 
                ? `${Math.round((metrics.activeRentals / metrics.totalItems) * 100)}%` 
                : '0%'}
              color="text-purple-400"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 border border-white/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Быстрые действия</h2>
              <div className="space-y-3">
                <Link 
                  href="/hub/gear-provider/items/new" 
                  className="block w-full px-4 py-3 bg-premium-gold text-premium-black font-medium rounded-lg text-center hover:bg-premium-gold/80 transition-colors"
                >
                  Добавить снаряжение
                </Link>
                <Link 
                  href="/hub/gear-provider/bookings" 
                  className="block w-full px-4 py-3 bg-white/10 text-white font-medium rounded-lg text-center hover:bg-white/20 transition-colors"
                >
                  Просмотреть бронирования
                </Link>
              </div>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Последние бронирования</h2>
              <p className="text-white/50 text-center py-8">
                Нет активных бронирований
              </p>
            </div>
          </div>
        </div>
      </main>
    </Protected>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}

function MetricCard({ icon: Icon, label, value, subValue, color }: MetricCardProps) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-8 h-8 text-white/50" />
        <div className={`text-3xl font-black ${color}`}>{value}</div>
      </div>
      <div className="text-white/70 text-sm">{label}</div>
      {subValue && <div className="text-white/50 text-xs mt-1">{subValue}</div>}
    </div>
  );
}
