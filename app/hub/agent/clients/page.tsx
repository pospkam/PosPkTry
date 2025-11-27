'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { AgentNav } from '@/components/agent/AgentNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { ClientFormModal } from '@/components/agent/Clients/ClientFormModal';

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

export default function AgentClientsPage() {
  const [clients, setClients] = useState<AgentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<AgentClient | null>(null);

  useEffect(() => {
    fetchClients();
  }, [searchTerm, statusFilter]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        limit: '100'
      });
      const response = await fetch(`/api/agent/clients?${params}`);
      const result = await response.json();

      if (result.success) {
        setClients(result.data.clients);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = () => {
    setShowCreateModal(true);
  };

  const handleEditClient = (client: AgentClient) => {
    setEditingClient(client);
  };

  const handleClientSaved = () => {
    setShowCreateModal(false);
    setEditingClient(null);
    fetchClients();
  };

  const columns = [
    {
      key: 'name',
      header: 'Клиент',
      render: (client: AgentClient) => (
        <div>
          <div className="font-medium text-white">{client.name}</div>
          <div className="text-white/60 text-sm">{client.email}</div>
          {client.company && (
            <div className="text-white/40 text-xs">{client.company}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Статус',
      render: (client: AgentClient) => (
        <StatusBadge status={client.status} />
      )
    },
    {
      key: 'source',
      header: 'Источник',
      render: (client: AgentClient) => (
        <div className="capitalize text-white text-sm">
          {client.source === 'direct' ? 'Прямой' :
           client.source === 'referral' ? 'Рекомендация' :
           client.source === 'social' ? 'Соцсети' :
           client.source === 'advertising' ? 'Реклама' :
           client.source}
        </div>
      )
    },
    {
      key: 'totalBookings',
      header: 'Бронирований',
      render: (client: AgentClient) => (
        <div className="text-white text-center">{client.totalBookings}</div>
      )
    },
    {
      key: 'totalSpent',
      header: 'Потрачено',
      render: (client: AgentClient) => (
        <div className="font-medium text-white">
          {client.totalSpent.toLocaleString('ru-RU')} ₽
        </div>
      )
    },
    {
      key: 'lastBooking',
      header: 'Последнее',
      render: (client: AgentClient) => (
        <div className="text-white/70 text-sm">
          {client.lastBooking
            ? new Date(client.lastBooking).toLocaleDateString('ru-RU')
            : 'Нет'
          }
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (client: AgentClient) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditClient(client)}
            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors"
          >
            Изменить
          </button>
          <button
            onClick={() => window.location.href = `/hub/agent/bookings?clientId=${client.id}`}
            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm transition-colors"
          >
            Бронирования
          </button>
        </div>
      )
    }
  ];

  return (
    <Protected roles={['agent']}>
      <main className="min-h-screen bg-transparent text-white">
        <AgentNav />

        {/* Header */}
        <div className="bg-white/25 border-b border-white/40 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-white">
                  Управление клиентами
                </h1>
                <p className="text-white/70 mt-1">
                  CRM система для работы с клиентами
                </p>
              </div>

              <button
                onClick={handleCreateClient}
                className="px-6 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-lg transition-colors"
              >
                Добавить клиента
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/25 border-b border-white/40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Поиск по имени или email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
                <option value="prospect">Потенциальные</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner message="Загрузка клиентов..." />
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
              <p className="text-red-400 mb-4">Ошибка загрузки клиентов</p>
              <button
                onClick={fetchClients}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                Повторить
              </button>
            </div>
          ) : (
            <div className="bg-white/25 border border-white/40 rounded-2xl overflow-hidden">
              <DataTable
                data={clients}
                columns={columns}
                emptyMessage="Клиенты не найдены"
              />
            </div>
          )}
        </div>

        {/* Modals */}
        {(showCreateModal || editingClient) && (
          <ClientFormModal
            client={editingClient}
            onClose={() => {
              setShowCreateModal(false);
              setEditingClient(null);
            }}
            onSave={handleClientSaved}
          />
        )}
      </main>
    </Protected>
  );
}

