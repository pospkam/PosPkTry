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
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/content/tours?${params}`);
      const result = await response.json();

      if (result.success) {
        setTours(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
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

      if (response.ok) {
        fetchTours();
      }
    } catch (error) {
      console.error('Error toggling tour status:', error);
    }
  };

  const handleArchive = async (tourId: string) => {
    if (!confirm('Вы уверены, что хотите архивировать этот тур?')) return;

    try {
      const response = await fetch(`/api/admin/content/tours/${tourId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchTours();
      }
    } catch (error) {
      console.error('Error archiving tour:', error);
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      easy: 'Легко',
      medium: 'Средне',
      hard: 'Сложно'
    };
    return labels[difficulty] || difficulty;
  };

  const columns: Column<AdminTour>[] = [
    {
      key: 'name',
      title: 'Название',
      sortable: true,
      render: (tour) => (
        <div>
          <p className="font-semibold text-white">{tour.name}</p>
          <p className="text-xs text-white/60 truncate max-w-xs">
            {tour.description.substring(0, 80)}...
          </p>
        </div>
      )
    },
    {
      key: 'operatorName',
      title: 'Оператор',
      render: (tour) => (
        <span className="text-white/80">{tour.operatorName}</span>
      )
    },
    {
      key: 'difficulty',
      title: 'Сложность',
      render: (tour) => (
        <span className="px-2 py-1 bg-white/10 rounded-lg text-xs">
          {getDifficultyLabel(tour.difficulty)}
        </span>
      )
    },
    {
      key: 'duration',
      title: 'Длительность',
      render: (tour) => (
        <span className="text-white/80">{tour.duration}ч</span>
      )
    },
    {
      key: 'price',
      title: 'Цена',
      sortable: true,
      render: (tour) => (
        <span className="font-semibold text-premium-gold">
          {formatCurrency(tour.price, tour.currency)}
        </span>
      )
    },
    {
      key: 'rating',
      title: 'Рейтинг',
      render: (tour) => (
        <div className="text-sm">
          <span className="text-yellow-400">★</span> {tour.rating.toFixed(1)}
          <span className="text-white/50 text-xs"> ({tour.reviewCount})</span>
        </div>
      )
    },
    {
      key: 'isActive',
      title: 'Статус',
      render: (tour) => (
        <StatusBadge status={tour.isActive ? 'active' : 'inactive'} />
      )
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (tour) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleToggleActive(tour.id, tour.isActive)}
            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors"
          >
            {tour.isActive ? 'Деакт.' : 'Акт.'}
          </button>
          <button
            onClick={() => handleArchive(tour.id)}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
          >
            Архив
          </button>
        </div>
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
                  Управление турами
                </h1>
                <p className="text-white/70 mt-1">
                  Модерация и управление турами платформы
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchBar
                  placeholder="Поиск по названию или описанию..."
                  onSearch={(query) => {
                    setSearch(query);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка туров..." />
            </div>
          ) : tours.length === 0 ? (
            <EmptyState
              icon="🏔️"
              title="Туры не найдены"
              description="Попробуйте изменить фильтры или условия поиска"
            />
          ) : (
            <div className="space-y-6">
              <DataTable
                columns={columns}
                data={tours}
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

