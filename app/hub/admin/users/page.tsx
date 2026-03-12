'use client';

import React, { useState, useEffect } from 'react';
import {
  DataTable,
  Pagination,
  SearchBar,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  Column
} from '@/components/admin/shared';
import { AdminUser } from '@/types/admin';
import { Users } from 'lucide-react';

export default function UsersManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [currentPage, search, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '20' });
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      const result = await response.json();
      if (result.success) {
        setUsers(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency', currency: 'RUB', minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(new Date(date));
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      tourist: 'Турист', operator: 'Оператор', guide: 'Гид',
      transfer: 'Трансфер', agent: 'Агент', admin: 'Админ'
    };
    return labels[role] || role;
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Пользователь',
      sortable: true,
      render: (user) => (
        <div>
          <p className="font-medium text-[var(--text-primary)] text-xs">{user.name}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{user.email}</p>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Роль',
      sortable: true,
      render: (user) => (
        <span className="px-1.5 py-0.5 bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded text-[10px] font-medium">
          {getRoleLabel(user.role)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Статус',
      render: (user) => <StatusBadge status={user.status === 'active' ? 'active' : 'inactive'} />
    },
    {
      key: 'bookingsCount',
      header: 'Броней',
      sortable: true,
      render: (user) => <span className="text-[var(--text-primary)] text-xs font-mono">{user.bookingsCount}</span>
    },
    {
      key: 'totalSpent',
      header: 'Потрачено',
      sortable: true,
      render: (user) => <span className="text-[var(--text-primary)] text-xs font-mono font-medium">{formatCurrency(user.totalSpent)}</span>
    },
    {
      key: 'createdAt',
      header: 'Регистрация',
      sortable: true,
      render: (user) => <span className="text-[var(--text-muted)] text-xs font-mono">{formatDate(user.createdAt)}</span>
    }
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Users className="w-4 h-4 text-[var(--text-muted)]" />
        <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Пользователи</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <SearchBar placeholder="Поиск по имени или email..." onSearch={(q) => { setSearch(q); setCurrentPage(1); }} />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">Все роли</option>
          <option value="tourist">Турист</option>
          <option value="operator">Оператор</option>
          <option value="guide">Гид</option>
          <option value="transfer">Трансфер</option>
          <option value="agent">Агент</option>
          <option value="admin">Админ</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка пользователей..." />
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="Пользователи не найдены" description="Попробуйте изменить фильтры" />
      ) : (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <DataTable columns={columns} data={users} />
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
