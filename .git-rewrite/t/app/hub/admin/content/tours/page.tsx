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
import { Star, FileText } from 'lucide-react';

interface AdminTour {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  duration: number;
  price: number;
  currency: string;
  operatorName: string;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: Date;
}

export default function ToursManagement() {
  const [tours, setTours] = useState<AdminTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchTours();
  }, [currentPage, search, statusFilter]);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '20' });
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/content/tours?${params}`);
      const result = await response.json();
      if (result.success) {
        setTours(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (tourId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/content/tours/${tourId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (response.ok) fetchTours();
    } catch {
      // ignore
    }
  };

  const handleArchive = async (tourId: string) => {
    if (!confirm('Вы уверены, что хотите архивировать этот тур?')) return;
    try {
      const response = await fetch(`/api/admin/content/tours/${tourId}`, { method: 'DELETE' });
      if (response.ok) fetchTours();
    } catch {
      // ignore
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency', currency: currency || 'RUB', minimumFractionDigits: 0
    }).format(value);
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = { easy: 'Легко', medium: 'Средне', hard: 'Сложно' };
    return labels[difficulty] || difficulty;
  };

  const columns: Column<AdminTour>[] = [
    {
      key: 'name',
      title: 'Название',
      sortable: true,
      render: (tour) => (
        <div>
          <p className="font-medium text-[var(--text-primary)]">{tour.name}</p>
          <p className="text-[10px] text-[var(--text-muted)] truncate max-w-xs">{tour.description.substring(0, 80)}...</p>
        </div>
      )
    },
    {
      key: 'operatorName',
      title: 'Оператор',
      render: (tour) => <span className="text-[var(--text-secondary)] text-xs">{tour.operatorName}</span>
    },
    {
      key: 'difficulty',
      title: 'Сложность',
      render: (tour) => (
        <span className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[10px] text-[var(--text-secondary)]">
          {getDifficultyLabel(tour.difficulty)}
        </span>
      )
    },
    {
      key: 'duration',
      title: 'Часы',
      render: (tour) => <span className="text-[var(--text-secondary)] text-xs font-mono">{tour.duration}ч</span>
    },
    {
      key: 'price',
      title: 'Цена',
      sortable: true,
      render: (tour) => <span className="font-medium text-[var(--text-primary)] text-xs font-mono">{formatCurrency(tour.price, tour.currency)}</span>
    },
    {
      key: 'rating',
      title: 'Рейтинг',
      render: (tour) => (
        <div className="flex items-center gap-1 text-xs">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-[var(--text-primary)]">{tour.rating.toFixed(1)}</span>
          <span className="text-[var(--text-muted)]">({tour.reviewCount})</span>
        </div>
      )
    },
    {
      key: 'isActive',
      title: 'Статус',
      render: (tour) => <StatusBadge status={tour.isActive ? 'active' : 'inactive'} />
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (tour) => (
        <div className="flex gap-1.5">
          <button
            onClick={() => handleToggleActive(tour.id, tour.isActive)}
            className="px-2.5 py-1 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded text-[10px] font-medium transition-colors"
          >
            {tour.isActive ? 'Деакт.' : 'Акт.'}
          </button>
          <button
            onClick={() => handleArchive(tour.id)}
            className="px-2.5 py-1 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded text-[10px] font-medium transition-colors"
          >
            Архив
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Управление турами</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <SearchBar placeholder="Поиск по названию..." onSearch={(q) => { setSearch(q); setCurrentPage(1); }} />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="inactive">Неактивные</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка туров..." />
        </div>
      ) : tours.length === 0 ? (
        <EmptyState title="Туры не найдены" description="Попробуйте изменить фильтры" />
      ) : (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <DataTable columns={columns} data={tours} />
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
