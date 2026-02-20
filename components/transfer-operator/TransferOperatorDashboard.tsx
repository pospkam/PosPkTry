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
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4">Последние бронирования</h3>

        {data.recentBookings && data.recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/70">ID</th>
                  <th className="text-left py-3 px-4 text-white/70">Клиент</th>
                  <th className="text-left py-3 px-4 text-white/70">Маршрут</th>
                  <th className="text-left py-3 px-4 text-white/70">Дата</th>
                  <th className="text-left py-3 px-4 text-white/70">Статус</th>
                  <th className="text-right py-3 px-4 text-white/70">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((booking: any) => (
                  <tr key={booking.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">#{booking.id?.substring(0, 8)}</td>
                    <td className="py-3 px-4">{booking.customer_name}</td>
                    <td className="py-3 px-4">{booking.route_name}</td>
                    <td className="py-3 px-4">{new Date(booking.transfer_date).toLocaleDateString('ru-RU')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        booking.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        booking.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                        booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-premium-gold font-semibold">
                      {booking.price?.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-white/50">
            <p>Нет бронирований</p>
          </div>
        )}
      </div>
    </div>
  );
}
