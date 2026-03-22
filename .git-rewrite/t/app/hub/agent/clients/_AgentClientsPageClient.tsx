'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { ClientFormModal } from '@/components/agent/Clients/ClientFormModal';

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';

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

export default function AgentClientsPageClient() {
  const router = useRouter();
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
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        limit: '100',
      });
      const response = await fetch(`/api/agent/clients?${params}`);
      const result = await response.json();

      if (result.success) {
        setClients(result.data.clients);
      } else {
        setError(result.error);
      }
    } catch {
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
          <div className="font-medium text-[var(--text-primary)]">{client.name}</div>
          <div className="text-[var(--text-muted)] text-sm">{client.email}</div>
          {client.company && (
            <div className="text-[var(--text-muted)] text-xs">{client.company}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (client: AgentClient) => (
        <StatusBadge
          status={
            client.status === 'prospect'
              ? 'info'
              : (client.status as import('@/components/admin/shared/StatusBadge').StatusType)
          }
        />
      ),
    },
    {
      key: 'source',
      header: 'Источник',
      render: (client: AgentClient) => (
        <div className="capitalize text-[var(--text-primary)] text-sm">
          {client.source === 'direct'
            ? 'Прямой'
            : client.source === 'referral'
              ? 'Рекомендация'
              : client.source === 'social'
                ? 'Соцсети'
                : client.source === 'advertising'
                  ? 'Реклама'
                  : client.source}
        </div>
      ),
    },
    {
      key: 'totalBookings',
      header: 'Бронирований',
      render: (client: AgentClient) => (
        <div className="text-[var(--text-primary)] text-center">{client.totalBookings}</div>
      ),
    },
    {
      key: 'totalSpent',
      header: 'Потрачено',
      render: (client: AgentClient) => (
        <div className="font-medium text-[var(--text-primary)]">
          {client.totalSpent.toLocaleString('ru-RU')} ₽
        </div>
      ),
    },
    {
      key: 'lastBooking',
      header: 'Последнее',
      render: (client: AgentClient) => (
        <div className="text-[var(--text-secondary)] text-sm">
          {client.lastBooking ? new Date(client.lastBooking).toLocaleDateString('ru-RU') : 'Нет'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (client: AgentClient) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditClient(client)}
            className="px-3 py-1 border border-[var(--border)] text-[var(--text-secondary)] rounded text-sm transition-colors hover:bg-[var(--bg-hover)]"
          >
            Изменить
          </button>
          <button
            onClick={() => router.push(`/hub/agent/bookings?clientId=${client.id}`)}
            className="px-3 py-1 bg-[var(--accent)] text-[var(--bg-card)] rounded text-sm transition-colors"
          >
            Бронирования
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Управление клиентами</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            CRM система для работы с клиентами
          </p>
        </div>
        <button
          onClick={handleCreateClient}
          className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-card)] text-sm font-semibold rounded-md transition-colors"
        >
          Добавить клиента
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={INPUT}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="inactive">Неактивные</option>
          <option value="prospect">Потенциальные</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner message="Загрузка клиентов..." />
        </div>
      ) : error ? (
        <div className="bg-[var(--bg-card)] border border-[var(--danger)]/30 rounded-lg p-6 text-center">
          <p className="text-[var(--danger)] mb-4">Ошибка загрузки клиентов</p>
          <button
            onClick={fetchClients}
            className="px-4 py-2 border border-[var(--danger)]/30 text-[var(--danger)] rounded-md text-sm transition-colors"
          >
            Повторить
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <DataTable data={clients} columns={columns} emptyMessage="Клиенты не найдены" />
        </div>
      )}

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
    </div>
  );
}
