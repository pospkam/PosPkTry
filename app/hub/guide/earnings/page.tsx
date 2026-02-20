'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { GuideNav } from '@/components/guide/GuideNav';

export const metadata = {
  title: 'Заработок | Kamhub',
  description: 'Заработок и выплаты гида',
};

import { LoadingSpinner } from '@/components/admin/shared';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';

interface EarningsSummary {
  totalEarnings: number;
  pendingPayment: number;
  toursCompleted: number;
  averagePerTour: number;
}

interface EarningsItem {
  id: string;
  tourName: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending';
}

export default function GuideEarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingPayment: 0,
    toursCompleted: 0,
    averagePerTour: 0,
  });
  const [earnings, setEarnings] = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    try {
      const response = await fetch(`/api/guide/earnings?period=${period}`);
      const data = await response.json();
      if (data.success && data.data) {
        setSummary(data.data.summary);
        setEarnings(data.data.items);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Protected roles={['guide', 'operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <GuideNav />
        
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white">Заработок</h1>
              <p className="text-white/70">Ваши доходы от проведения туров</p>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
              <option value="year">Год</option>
              <option value="all">Все время</option>
            </select>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <LoadingSpinner message="Загрузка данных..." />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/10 border border-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <DollarSign className="w-8 h-8 text-white/50" />
                    <span className="text-3xl font-black text-green-400">
                      {summary.totalEarnings.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div className="text-white/70 text-sm">Всего заработано</div>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <DollarSign className="w-8 h-8 text-white/50" />
                    <span className="text-3xl font-black text-yellow-400">
                      {summary.pendingPayment.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div className="text-white/70 text-sm">Ожидает выплаты</div>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Calendar className="w-8 h-8 text-white/50" />
                    <span className="text-3xl font-black text-blue-400">
                      {summary.toursCompleted}
                    </span>
                  </div>
                  <div className="text-white/70 text-sm">Туров проведено</div>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <TrendingUp className="w-8 h-8 text-white/50" />
                    <span className="text-3xl font-black text-purple-400">
                      {summary.averagePerTour.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div className="text-white/70 text-sm">Средний доход за тур</div>
                </div>
              </div>

              {/* Earnings List */}
              <div className="bg-white/10 border border-white/20 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-xl font-bold">История начислений</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm">
                    <Download className="w-4 h-4" />
                    Экспорт
                  </button>
                </div>

                {earnings.length === 0 ? (
                  <div className="p-12 text-center text-white/50">
                    Нет данных за выбранный период
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {earnings.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                        <div>
                          <div className="font-medium">{item.tourName}</div>
                          <div className="text-sm text-white/50">
                            {new Date(item.date).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${item.status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {item.amount.toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="text-xs text-white/50">
                            {item.status === 'paid' ? 'Выплачено' : 'Ожидает'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </Protected>
  );
}
