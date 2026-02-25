'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { TransferOperatorDashboard } from '@/components/transfer-operator/TransferOperatorDashboard';
import { TransferDriverManagement } from '@/components/transfer-operator/TransferDriverManagement';
import { TransferRouteManagement } from '@/components/transfer-operator/TransferRouteManagement';
import { TransferBookingManagement } from '@/components/transfer-operator/TransferBookingManagement';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, BarChart3, Users, Map, Calendar, RefreshCw } from 'lucide-react';

type ActiveTab = 'dashboard' | 'drivers' | 'routes' | 'bookings';

interface TransferOperatorData {
  metrics: {
    totalBookings: number;
    activeBookings: number;
    totalRevenue: number;
    availableDrivers: number;
    activeRoutes: number;
    completedTransfers: number;
  };
  recentBookings: any[];
  drivers: any[];
  routes: any[];
  bookings: any[];
}

export default function TransferOperatorPageClient() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [data, setData] = useState<TransferOperatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operatorId = user?.id;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/transfer-operator/dashboard?operatorId=${operatorId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
    } catch (err) {
      console.error('Error fetching transfer operator data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard' as ActiveTab, name: 'Панель управления', Icon: BarChart3 },
    { id: 'drivers' as ActiveTab, name: 'Водители', Icon: Users },
    { id: 'routes' as ActiveTab, name: 'Маршруты', Icon: Map },
    { id: 'bookings' as ActiveTab, name: 'Бронирования', Icon: Calendar },
  ];

  return (
    <Protected roles={['transfer', 'operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <OperatorNav />
        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-white">
                  Оператор трансферов
                </h1>
                <p className="text-white/70 mt-1">
                  Управление водителями, маршрутами и трансферами
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-white/50">Оператор</div>
                  <div className="font-semibold">{user?.name || 'Неизвестно'}</div>
                </div>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Обновить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/10 border-b border-white/15">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-premium-gold text-premium-black border-b-2 border-white/15'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {React.createElement(tab.Icon, { className: 'w-5 h-5' })}
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка данных..." />
            </div>
          ) : error ? (
            <EmptyState
              icon={<AlertTriangle className="w-12 h-12 text-yellow-500" />}
              title="Ошибка загрузки данных"
              description={error}
              action={
                <button
                  onClick={fetchData}
                  className="px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-lg transition-colors"
                >
                  Попробовать снова
                </button>
              }
            />
          ) : (
            <>
              {activeTab === 'dashboard' && data && (
                <TransferOperatorDashboard data={data} />
              )}

              {activeTab === 'drivers' && (
                <TransferDriverManagement operatorId={operatorId!} onDataChange={fetchData} />
              )}

              {activeTab === 'routes' && (
                <TransferRouteManagement operatorId={operatorId!} onDataChange={fetchData} />
              )}

              {activeTab === 'bookings' && (
                <TransferBookingManagement operatorId={operatorId!} onDataChange={fetchData} />
              )}
            </>
          )}
        </div>
      </main>
    </Protected>
  );
}