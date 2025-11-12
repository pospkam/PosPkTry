'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/admin/shared';

interface Driver {
  id: string;
  name: string;
  phone: string;
  car_model: string;
  car_number: string;
  status: 'available' | 'busy' | 'offline';
  rating: number;
  total_transfers: number;
}

interface TransferDriverManagementProps {
  operatorId: string;
  onDataChange: () => void;
}

export function TransferDriverManagement({ operatorId, onDataChange }: TransferDriverManagementProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transfer-operator/drivers?operatorId=${operatorId}`);
      const result = await response.json();

      if (result.success) {
        setDrivers(result.data.drivers || []);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (driverId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/transfer-operator/drivers/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchDrivers();
        onDataChange();
      }
    } catch (error) {
      console.error('Error updating driver status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Загрузка водителей..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Управление водителями</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-lg transition-colors"
        >
          {showAddForm ? '✕ Отмена' : '+ Добавить водителя'}
        </button>
      </div>

      {/* Add Driver Form */}
      {showAddForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Новый водитель</h3>
          <form className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="ФИО"
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
            <input
              type="tel"
              placeholder="Телефон"
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
            <input
              type="text"
              placeholder="Модель авто"
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
            <input
              type="text"
              placeholder="Гос. номер"
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            />
            <button
              type="submit"
              className="col-span-2 px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-semibold rounded-lg transition-colors"
            >
              Добавить
            </button>
          </form>
        </div>
      )}

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <div key={driver.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{driver.name}</h3>
                <p className="text-white/70 text-sm">{driver.phone}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                driver.status === 'available' ? 'bg-green-500/20 text-green-400' :
                driver.status === 'busy' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {driver.status === 'available' ? 'Доступен' : 
                 driver.status === 'busy' ? 'Занят' : 'Оффлайн'}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <span>🚗</span>
                <span className="text-sm">{driver.car_model}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🔢</span>
                <span className="text-sm">{driver.car_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span className="text-sm">{driver.rating.toFixed(1)} ({driver.total_transfers} поездок)</span>
              </div>
            </div>

            <select
              value={driver.status}
              onChange={(e) => handleStatusChange(driver.id, e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
            >
              <option value="available">Доступен</option>
              <option value="busy">Занят</option>
              <option value="offline">Оффлайн</option>
            </select>
          </div>
        ))}

        {drivers.length === 0 && (
          <div className="col-span-full text-center py-12 text-white/50">
            <p>Нет водителей. Добавьте первого!</p>
          </div>
        )}
      </div>
    </div>
  );
}