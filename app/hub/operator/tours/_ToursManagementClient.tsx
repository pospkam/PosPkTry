'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Star, Mountain } from 'lucide-react';

const SELECT = 'px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors';

export default function ToursManagementClient() {
  const { user } = useAuth();
  const router = useRouter();
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
        ...(operatorId ? { operatorId } : {}),
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
        toast.error(result.message || 'Ошибка при удалении тура');
      }
    } catch (error) {
      console.error('Error deleting tour:', error);
      toast.error('Ошибка при удалении тура');
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
            <Image
              src={tour.images[0]}
              alt={tour.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-lg mr-3 object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg mr-3 bg-[var(--bg-hover)] flex items-center justify-center">
              <span className="text-2xl">🏔</span>
            </div>
          )}
          <div>
            <Link
              href={`/hub/operator/tours/${tour.id}`}
              className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              {tour.name}
            </Link>
            <p className="text-xs text-[var(--text-muted)]">{tour.category}</p>
          </div>
        </div>
      )
    },
    {
      key: 'difficulty',
      title: 'Сложность',
      render: (tour) => (
        <span className="px-2 py-1 bg-[var(--bg-hover)] border border-[var(--border)] rounded text-xs text-[var(--text-secondary)]">
          {getDifficultyLabel(tour.difficulty)}
        </span>
      )
    },
    {
      key: 'duration',
      title: 'Длит.',
      render: (tour) => (
        <span className="text-[var(--text-secondary)]">{tour.duration}ч</span>
      )
    },
    {
      key: 'maxGroupSize',
      title: 'Макс. группа',
      render: (tour) => (
        <span className="text-[var(--text-secondary)]">
          <Users className="w-5 h-5 mr-1 inline" />
          {tour.maxGroupSize}
        </span>
      )
    },
    {
      key: 'price',
      title: 'Цена',
      sortable: true,
      render: (tour) => (
        <span className="font-semibold text-[var(--text-primary)]">
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
          <div className="font-semibold text-[var(--text-primary)]">{tour.bookingsCount}</div>
          <div className="text-xs text-[var(--text-muted)]">
            {formatCurrency(tour.totalRevenue, tour.currency)}
          </div>
        </div>
      )
    },
    {
      key: 'rating',
      title: 'Рейтинг',
      render: (tour) => (
        <div className="text-sm text-[var(--text-secondary)]">
          <Star
            className="w-4 h-4 inline"
            style={{ color: 'var(--warning)', fill: 'var(--warning)' }}
          />{' '}
          {tour.rating.toFixed(1)}
          <span className="text-[var(--text-muted)] text-xs"> ({tour.reviewCount})</span>
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
            className="px-3 py-1 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-md text-xs font-medium transition-colors"
          >
            Изменить
          </Link>
          <button
            onClick={() => handleToggleActive(tour.id, tour.isActive)}
            className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
            style={{ color: 'var(--warning)', border: '1px solid var(--warning)' }}
          >
            {tour.isActive ? 'Скрыть' : 'Показать'}
          </button>
          <button
            onClick={() => handleDelete(tour.id)}
            className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
            style={{ color: 'var(--danger)', border: '1px solid var(--danger)' }}
          >
            Удалить
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Мои туры</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Управление вашими турами и экскурсиями
          </p>
        </div>
        <Link
          href="/hub/operator/tours/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-card)] text-sm font-semibold rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Создать тур
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
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
          className={SELECT}
        >
          <option value="">Все категории</option>
          <option value="vulkani">Вулканы</option>
          <option value="geyzery">Гейзеры</option>
          <option value="rybalka">Рыбалка</option>
          <option value="termalnye_istochniki">Термы</option>
          <option value="medvedi">Медведи</option>
          <option value="morskie_progulki">Морские</option>
          <option value="vertoletnye_tury">Вертолёты</option>
          <option value="trekking">Треккинг</option>
          <option value="snegohod">Снегоходы</option>
          <option value="dzhip">Джипы</option>
          <option value="ozera">Озёра</option>
          <option value="gory">Горы</option>
          <option value="reki">Реки</option>
          <option value="eko">Эко</option>
          <option value="kombo">Комбо</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={SELECT}
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
        <EmptyState
          icon={Mountain}
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
                  onClick: () => router.push('/hub/operator/tours/new')
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
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
  );
}
