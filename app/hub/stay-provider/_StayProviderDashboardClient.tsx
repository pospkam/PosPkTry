'use client';

import { LoadingSpinner } from '@/components/admin/shared';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface StayMetrics {
  totalAccommodations: number;
  totalBookings: number;
  totalRooms: number;
  monthlyRevenue: number;
}

interface StayBooking {
  id: string;
  accommodation_name: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
}

interface StayDashboardData {
  metrics: StayMetrics;
  recentBookings: StayBooking[];
}

interface StayDashboardApiResponse {
  metrics: StayMetrics;
  recentBookings: StayBooking[];
}

const EMPTY_METRICS: StayMetrics = {
  totalAccommodations: 0,
  totalBookings: 0,
  totalRooms: 0,
  monthlyRevenue: 0,
};

export default function StayProviderDashboardClient() {
  const { data, loading } = useApiFetch<StayDashboardApiResponse, StayDashboardData>(
    '/api/stay-provider/dashboard',
    (d) => ({ metrics: d?.metrics ?? EMPTY_METRICS, recentBookings: d?.recentBookings ?? [] }),
  );

  const metrics = data?.metrics ?? EMPTY_METRICS;
  const bookings = data?.recentBookings ?? [];

  if (loading) {
    return (
      <div className="p-5 lg:p-6 flex items-center justify-center min-h-[300px]">
        <LoadingSpinner message="Загрузка dashboard..." />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Dashboard Размещений</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Управление вашими объектами размещения</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">Объектов</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{metrics.totalAccommodations}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">Бронирований</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{metrics.totalBookings}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">Номеров</p>
          <p className="text-3xl font-bold text-[var(--accent)]">{metrics.totalRooms}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">Доход</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{(metrics.monthlyRevenue / 1000).toFixed(0)}K ₽</p>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Последние бронирования</h2>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">Нет бронирований</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {bookings.map((booking) => (
              <div key={booking.id} className="px-5 py-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{booking.accommodation_name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(booking.check_in_date).toLocaleDateString('ru-RU')} —{' '}
                      {new Date(booking.check_out_date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {booking.total_price.toLocaleString('ru-RU')} ₽
                    </p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${
                      booking.status === 'confirmed'
                        ? 'text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10'
                        : 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
