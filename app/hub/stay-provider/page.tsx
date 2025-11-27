'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { LoadingSpinner } from '@/components/admin/shared';

export default function StayProviderDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stay-provider/dashboard');
      const result = await response.json();

      if (result.success) {
        setMetrics(result.data.metrics);
        setBookings(result.data.recentBookings || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Protected roles={['admin']}>
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <LoadingSpinner message="Загрузка dashboard..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <div className="bg-white/15 border-b border-white/15 p-6">
          <h1 className="text-3xl font-black text-white">Dashboard Размещений</h1>
          <p className="text-white/70">Управление вашими объектами размещения</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/15 border border-white/15 rounded-xl p-6">
              <p className="text-white/50 text-sm mb-2">Объектов</p>
              <p className="text-4xl font-black text-white">{metrics?.totalAccommodations || 0}</p>
            </div>
            <div className="bg-white/15 border border-white/15 rounded-xl p-6">
              <p className="text-white/50 text-sm mb-2">Бронирований</p>
              <p className="text-4xl font-black text-green-400">{metrics?.totalBookings || 0}</p>
            </div>
            <div className="bg-white/15 border border-white/15 rounded-xl p-6">
              <p className="text-white/50 text-sm mb-2">Номеров</p>
              <p className="text-4xl font-black text-blue-400">{metrics?.totalRooms || 0}</p>
            </div>
            <div className="bg-white/15 border border-white/15 rounded-xl p-6">
              <p className="text-white/50 text-sm mb-2">Доход</p>
              <p className="text-4xl font-black text-white">{((metrics?.monthlyRevenue || 0) / 1000).toFixed(0)}K ₽</p>
            </div>
          </div>

          <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Последние бронирования</h2>
            {bookings.length === 0 ? (
              <p className="text-white/50 text-center py-8">Нет бронирований</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white/15 border border-white/15 rounded-xl p-4">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{booking.accommodation_name}</h3>
                        <p className="text-sm text-white/70">
                          {new Date(booking.check_in_date).toLocaleDateString('ru-RU')} - {new Date(booking.check_out_date).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">{booking.total_price.toLocaleString('ru-RU')} ₽</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
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
      </main>
    </Protected>
  );
}