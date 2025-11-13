'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';
import {
  DataTable,
  Pagination,
  SearchBar,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  Column
} from '@/components/admin/shared';
import { OperatorTour } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ToursManagement() {
  const { user } = useAuth();
  const [tours, setTours] = useState<OperatorTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');

  const operatorId = user?.id;

  useEffect(() => {
    fetchTours();
  }, [currentPage, search, statusFilter, categoryFilter]);

  const fetchTours = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        operatorId,
        page: currentPage.toString(),
        limit: '20'
      });

      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/operator/tours?${params}`);
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
      const response = await fetch(`/api/operator/tours/${tourId}?operatorId=${operatorId}`, {
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

  const handleDelete = async (tourId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тур? Это действие нельзя отменить.')) {
      return;
    }

    try {
      const response = await fetch(`/api/operator/tours/${tourId}?operatorId=${operatorId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        fetchTours();
      } else {
        alert(result.message || 'Ошибка при удалении тура');
      }
    } catch (error) {
      console.error('Error deleting tour:', error);
      alert('Ошибка при удалении тура');
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

  const columns: Column<OperatorTour>[] = [
    {
      key: 'name',
      title: 'Название',
      sortable: true,
      render: (tour) => (
        <div className="flex items-center">
          {tour.images && tour.images.length > 0 ? (
            <img
              src={tour.images[0]}
              alt={tour.name}
              className="w-12 h-12 rounded-lg mr-3 object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg mr-3 bg-white/10 flex items-center justify-center">
              <span className="text-2xl"> </span>
            </div>
          )}
          <div>
            <Link
              href={`/hub/operator/tours/${tour.id}`}
              className="font-semibold text-white hover:text-premium-gold transition-colors"
            >
              {tour.name}
            </Link>
            <p className="text-xs text-white/60">{tour.category}</p>
          </div>
        </div>
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
      title: 'Длит.',
      render: (tour) => (
        <span className="text-white/80">{tour.duration}ч</span>
      )
    },
    {
      key: 'maxGroupSize',
      title: 'Макс. группа',
      render: (tour) => (
        <span className="text-white/80">
          <span className="text-xl mr-1"> </span>
          {tour.maxGroupSize}
        </span>
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
      key: 'bookingsCount',
      title: 'Брони',
      sortable: true,
      render: (tour) => (
        <div className="text-center">
          <div className="font-semibold text-white">{tour.bookingsCount}</div>
          <div className="text-xs text-white/50">
            {formatCurrency(tour.totalRevenue, tour.currency)}
          </div>
        </div>
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
          <Link
            href={`/hub/operator/tours/${tour.id}`}
            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors"
          >
            Изменить
          </Link>
          <button
            onClick={() => handleToggleActive(tour.id, tour.isActive)}
            className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-xs font-medium transition-colors"
          >
            {tour.isActive ? 'Скрыть' : 'Показать'}
          </button>
          <button
            onClick={() => handleDelete(tour.id)}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
          >
            Удалить
          </button>
        </div>
      )
    }
  ];

  return (
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-premium-black text-white">
        <OperatorNav />
        
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black text-premium-gold">
                  Мои туры
                </h1>
                <p className="text-white/70 mt-1">
                  Управление вашими турами и экскурсиями
                </p>
              </div>
              <Link
                href="/hub/operator/tours/new"
                className="px-6 py-3 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-xl transition-colors"
              >
                <span className="mr-2">➕</span>
                Создать тур
              </Link>
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
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              >
                <option value="">Все категории</option>
                <option value="adventure">Приключения</option>
                <option value="nature">Природа</option>
                <option value="culture">Культура</option>
                <option value="extreme">Экстрим</option>
                <option value="relaxation">Отдых</option>
              </select>
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
              icon=" "
              title="Туры не найдены"
              description={
                search || categoryFilter || statusFilter !== 'all'
                  ? 'Попробуйте изменить фильтры'
                  : 'Создайте свой первый тур'
              }
              action={
                !search && !categoryFilter && statusFilter === 'all'
                  ? {
                      label: 'Создать тур',
                      onClick: () => (window.location.href = '/hub/operator/tours/new')
                    }
                  : undefined
              }
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




