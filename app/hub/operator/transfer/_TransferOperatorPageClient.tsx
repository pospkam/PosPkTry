'use client';

import React, { useState, useEffect } from 'react';
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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard' as ActiveTab, name: 'Панель управления', Icon: BarChart3 },
    { id: 'drivers'   as ActiveTab, name: 'Водители',          Icon: Users    },
    { id: 'routes'    as ActiveTab, name: 'Маршруты',           Icon: Map      },
    { id: 'bookings'  as ActiveTab, name: 'Бронирования',       Icon: Calendar },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Оператор трансферов
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Управление водителями, маршрутами и трансферами
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)]">Оператор</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {user?.name || 'Неизвестно'}
            </div>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-card)] text-sm font-semibold rounded-md hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={
                activeTab === tab.id
                  ? { backgroundColor: 'var(--accent)', color: 'var(--bg-card)' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {React.createElement(tab.Icon, { className: 'w-4 h-4' })}
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка данных..." />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12" style={{ color: 'var(--warning)' }} />}
          title="Ошибка загрузки данных"
          description={error}
          action={{
            label: 'Попробовать снова',
            onClick: fetchData,
          }}
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
  );
}
