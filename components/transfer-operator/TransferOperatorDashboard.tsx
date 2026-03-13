'use client';

import React from 'react';
import { TransferOperatorMetricsGrid } from './Dashboard/TransferOperatorMetricsGrid';

interface TransferOperatorDashboardProps {
  data: {
    metrics: {
      totalBookings: number;
      activeBookings: number;
      totalRevenue: number;
      availableDrivers: number;
      activeRoutes: number;
      completedTransfers: number;
    };
    recentBookings: any[];
  };
}

export function TransferOperatorDashboard({ data }: TransferOperatorDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Metrics */}
      <TransferOperatorMetricsGrid metrics={data.metrics} />

      {/* Recent Bookings */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Последние бронирования</h3>

        {data.recentBookings && data.recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-[var(--text-muted)]">ID</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)]">Клиент</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)]">Маршрут</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)]">Дата</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)]">Статус</th>
                  <th className="text-right py-3 px-4 text-[var(--text-muted)]">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((booking: any) => (
                  <tr key={booking.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
                    <td className="py-3 px-4">#{booking.id?.substring(0, 8)}</td>
                    <td className="py-3 px-4">{booking.customer_name}</td>
                    <td className="py-3 px-4">{booking.route_name}</td>
                    <td className="py-3 px-4">{new Date(booking.transfer_date).toLocaleDateString('ru-RU')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        booking.status === 'completed' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                        booking.status === 'active' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' :
                        booking.status === 'pending' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' :
                        'bg-[var(--bg-card)] text-[var(--text-muted)]'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--accent)] font-semibold">
                      {booking.price?.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <p>Нет бронирований</p>
          </div>
        )}
      </div>
    </div>
  );
}
