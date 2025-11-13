'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { AdminNav } from '@/components/admin/AdminNav';
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
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      const result = await response.json();

      if (result.success) {
        setUsers(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      tourist: 'Турист',
      operator: 'Оператор',
      guide: 'Гид',
      transfer: 'Трансфер',
      agent: 'Агент',
      admin: 'Админ'
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
          <p className="font-semibold text-white">{user.name}</p>
          <p className="text-xs text-white/60">{user.email}</p>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Роль',
      sortable: true,
      render: (user) => (
        <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-xs font-bold">
          {getRoleLabel(user.role)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Статус',
      render: (user) => (
        <StatusBadge status={user.status === 'active' ? 'active' : 'inactive'} />
      )
    },
    {
      key: 'bookingsCount',
      header: 'Бронирования',
      sortable: true,
      render: (user) => (
        <span className="text-white">{user.bookingsCount}</span>
      )
    },
    {
      key: 'totalSpent',
      header: 'Потрачено',
      sortable: true,
      render: (user) => (
        <span className="text-white font-semibold">
          {formatCurrency(user.totalSpent)}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'Регистрация',
      sortable: true,
      render: (user) => (
        <span className="text-white/70 text-sm">
          {formatDate(user.createdAt)}
        </span>
      )
    }
  ];

  return (
    <Protected roles={['admin']}>
      <main className="min-h-screen bg-premium-black text-white">
        <AdminNav />
        
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black text-premium-gold">
                  Управление пользователями
                </h1>
                <p className="text-white/70 mt-1">
                  Список всех пользователей платформы
                </p>
              </div>
              <button className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl font-bold hover:bg-premium-gold/90 transition-colors">
                + Добавить пользователя
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchBar
                  placeholder="Поиск по имени или email..."
                  onSearch={handleSearch}
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
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
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка пользователей..." />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon="👥"
              title="Пользователи не найдены"
              description="Попробуйте изменить фильтры или условия поиска"
            />
          ) : (
            <div className="space-y-6">
              <DataTable
                columns={columns}
                data={users}
                onRowClick={(user) => {
                  // Navigate to user details
                  console.log('View user:', user.id);
                }}
              />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}

