'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { StatusBadge } from '../../admin/shared/StatusBadge';

interface AgentClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: Date;
  status: 'active' | 'inactive' | 'prospect';
  notes?: string;
  tags: string[];
  source: 'direct' | 'referral' | 'social' | 'advertising' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

interface RecentClientsTableProps {
  limit?: number;
}

export function RecentClientsTable({ limit = 5 }: RecentClientsTableProps) {
  const [clients, setClients] = useState<AgentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, [limit]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: limit.toString() });
      const response = await fetch(`/api/agent/clients?${params}`);
      const result = await response.json();

      if (result.success) {
        setClients(result.data.clients);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error fetching recent clients:', err);
      setError('Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoadingSpinner message="Загрузка клиентов..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
        <p className="text-red-400 mb-2">Ошибка загрузки клиентов</p>
        <button
          onClick={fetchClients}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white/60 mb-4">У вас пока нет клиентов</p>
        <button
          onClick={() => window.location.href = '/hub/agent/clients'}
          className="px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-lg transition-colors"
        >
          Добавить первого клиента
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Недавние клиенты</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Клиент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Бронирований
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Потрачено
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                Последнее
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-white">{client.name}</div>
                    <div className="text-sm text-white/60">{client.email}</div>
                    {client.company && (
                      <div className="text-xs text-white/40">{client.company}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {client.totalBookings}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-premium-gold font-medium">
                  {client.totalSpent.toLocaleString('ru-RU')} ₽
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                  {client.lastBooking
                    ? new Date(client.lastBooking).toLocaleDateString('ru-RU')
                    : 'Нет'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-white/10 bg-white/5">
        <button
          onClick={() => window.location.href = '/hub/agent/clients'}
          className="text-premium-gold hover:text-premium-gold/80 text-sm font-medium transition-colors"
        >
          Посмотреть всех клиентов →
        </button>
      </div>
    </div>
  );
}

