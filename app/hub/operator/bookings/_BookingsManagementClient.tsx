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
import { OperatorBooking } from '@/types/operator';
import { Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const SELECT = 'px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors';

export default function BookingsManagementClient() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<OperatorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<OperatorBooking | null>(null);

  const operatorId = user?.id;

  useEffect(() => {
    fetchBookings();
  }, [currentPage, search, statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        ...(operatorId ? { operatorId } : {}),
        page: currentPage.toString(),
        limit: '20'
      });

      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/operator/bookings?${params}`);
      const result = await response.json();

      if (result.success) {
        setBookings(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/operator/bookings/${bookingId}?operatorId=${operatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || 'Статус обновлён успешно');
        fetchBookings();
      } else {
        toast.error(result.error || 'Ошибка при обновлении');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Ошибка при обновлении бронирования');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'pending';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает',
      confirmed: 'Подтверждено',
      cancelled: 'Отменено',
      completed: 'Завершено'
    };
    return labels[status] || status;
  };

  const columns: Column<OperatorBooking>[] = [
    {
      key: 'id',
      title: 'ID',
      width: '100px',
      render: (booking) => (
        <span className="text-[var(--text-muted)] font-mono text-xs">
          #{booking.id.substring(0, 8)}
        </span>
      )
    },
    {
      key: 'tourName',
      title: 'Тур',
      render: (booking) => (
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{booking.tourName}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {new Date(booking.date).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      )
    },
    {
      key: 'userName',
      title: 'Клиент',
      render: (booking) => (
        <div>
          <p className="text-[var(--text-primary)]">{booking.userName}</p>
          <p className="text-xs text-[var(--text-muted)]">{booking.userEmail}</p>
          {booking.userPhone && (
            <p className="text-xs text-[var(--text-muted)]">{booking.userPhone}</p>
          )}
        </div>
      )
    },
    {
      key: 'guestsCount',
      title: 'Гости',
      render: (booking) => (
        <span className="text-[var(--text-secondary)]">
          <span className="text-xl mr-1"> </span>
          {booking.guestsCount}
        </span>
      )
    },
    {
      key: 'totalPrice',
      title: 'Сумма',
      render: (booking) => (
        <div>
          <div className="font-semibold text-[var(--text-primary)]">
            {formatCurrency(booking.totalPrice)}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {booking.paymentStatus === 'paid' ? <><Check className="w-3 h-3 inline mr-1" />Оплачено</> : 'Ожидает'}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Статус',
      render: (booking) => (
        <StatusBadge status={getStatusType(booking.status) as any} label={getStatusLabel(booking.status)} />
      )
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (booking) => (
        <div className="flex flex-col gap-1">
          {booking.status === 'pending' && (
            <>
              <button
                onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                className="px-3 py-1 bg-[var(--success)]/10 hover:bg-[var(--success)]/20 text-[var(--success)] rounded-md text-xs font-medium transition-colors"
              >
                Подтвердить
              </button>
              <button
                onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                className="px-3 py-1 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-md text-xs font-medium transition-colors"
              >
                Отменить
              </button>
            </>
          )}
          {booking.status === 'confirmed' && (
            <>
              <button
                onClick={() => handleUpdateStatus(booking.id, 'completed')}
                className="px-3 py-1 border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md text-xs font-medium transition-colors"
              >
                Завершить
              </button>
              <button
                onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                className="px-3 py-1 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 text-[var(--danger)] rounded-md text-xs font-medium transition-colors"
              >
                Отменить
              </button>
            </>
          )}
          {(booking.status === 'completed' || booking.status === 'cancelled') && (
            <button
              onClick={() => setSelectedBooking(booking)}
              className="px-3 py-1 border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md text-xs font-medium transition-colors"
            >
              Детали
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Бронирования</h1>
          <p className="text-[var(--text-muted)] mt-1">Управление бронированиями ваших туров</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            placeholder="Поиск по клиенту, email или туру..."
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
          className={SELECT}
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидают подтверждения</option>
          <option value="confirmed">Подтверждённые</option>
          <option value="completed">Завершённые</option>
          <option value="cancelled">Отменённые</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка бронирований..." />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon=" "
          title="Бронирований не найдено"
          description={
            search || statusFilter !== 'all'
              ? 'Попробуйте изменить фильтры'
              : 'Бронирования появятся здесь'
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-[var(--text-muted)] text-sm">Ожидают</p>
              <p className="text-2xl font-bold text-[var(--warning)]">
                {bookings.filter(b => b.status === 'pending').length}
              </p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-[var(--text-muted)] text-sm">Подтверждены</p>
              <p className="text-2xl font-bold text-[var(--success)]">
                {bookings.filter(b => b.status === 'confirmed').length}
              </p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-[var(--text-muted)] text-sm">Завершены</p>
              <p className="text-2xl font-bold text-[var(--accent)]">
                {bookings.filter(b => b.status === 'completed').length}
              </p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-[var(--text-muted)] text-sm">Отменены</p>
              <p className="text-2xl font-bold text-[var(--danger)]">
                {bookings.filter(b => b.status === 'cancelled').length}
              </p>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={bookings}
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
