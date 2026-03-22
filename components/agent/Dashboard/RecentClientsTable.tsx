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
      <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-4 text-center">
        <p className="text-[var(--danger)] mb-2">Ошибка загрузки клиентов</p>
        <button
          onClick={fetchClients}
          className="px-3 py-1 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded text-sm transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[var(--text-muted)] mb-4">У вас пока нет клиентов</p>
        <button
          onClick={() => window.location.href = '/hub/agent/clients'}
          className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-[var(--bg-card)] font-bold rounded-lg transition-colors"
        >
          Добавить первого клиента
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Недавние клиенты</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--bg-card)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Клиент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Бронирований
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Потрачено
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Последнее
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{client.name}</div>
                    <div className="text-sm text-[var(--text-muted)]">{client.email}</div>
                    {client.company && (
                      <div className="text-xs text-[var(--text-muted)]">{client.company}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                  {client.totalBookings}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--accent)] font-medium">
                  {client.totalSpent.toLocaleString('ru-RU')} ₽
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
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

      <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-card)]">
        <button
          onClick={() => window.location.href = '/hub/agent/clients'}
          className="text-[var(--accent)] hover:text-[var(--accent)]/80 text-sm font-medium transition-colors"
        >
          Посмотреть всех клиентов →
        </button>
      </div>
    </div>
  );
}

