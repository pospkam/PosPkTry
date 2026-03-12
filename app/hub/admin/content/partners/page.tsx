'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Partner } from '@/types';
import {
  DataTable,
  Pagination,
  SearchBar,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  Column
} from '@/components/admin/shared';
import { Star, Briefcase } from 'lucide-react';

export default function PartnersManagement() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('all');

  useEffect(() => {
    fetchPartners();
  }, [currentPage, search, categoryFilter, verifiedFilter]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '20' });
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);

      const response = await fetch(`/api/admin/content/partners?${params}`);
      const result = await response.json();
      if (result.success) {
        setPartners(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (partnerId: string) => {
    try {
      const response = await fetch(`/api/admin/content/partners/${partnerId}/verify`, { method: 'POST' });
      if (response.ok) fetchPartners();
    } catch {
      // ignore
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      accommodation: 'Размещение', tour_operator: 'Туроператор', transfer: 'Трансфер',
      guide: 'Гид', souvenir: 'Сувениры', gear: 'Снаряжение', restaurant: 'Ресторан'
    };
    return labels[category] || category;
  };

  const columns: Column<Partner>[] = [
    {
      key: 'name',
      title: 'Название',
      sortable: true,
      render: (partner) => (
        <div className="flex items-center">
          {partner.logo && (
            <div className="w-8 h-8 rounded mr-2.5 relative overflow-hidden bg-[var(--bg-hover)]">
              <Image src={partner.logo.url} alt={partner.name} fill className="object-cover" sizes="32px" />
            </div>
          )}
          <div>
            <p className="font-medium text-[var(--text-primary)] text-xs">{partner.name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{getCategoryLabel(partner.category)}</p>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      title: 'Контакт',
      render: (partner) => <span className="text-[var(--text-secondary)] text-xs">{partner.contact?.phone || '—'}</span>
    },
    {
      key: 'rating',
      title: 'Рейтинг',
      render: (partner) => (
        <div className="flex items-center gap-1 text-xs">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-[var(--text-primary)]">{partner.rating.toFixed(1)}</span>
          <span className="text-[var(--text-muted)]">({partner.reviewCount})</span>
        </div>
      )
    },
    {
      key: 'isVerified',
      title: 'Статус',
      render: (partner) => <StatusBadge status={partner.isVerified ? 'success' : 'pending'} />
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (partner) => (
        <div>
          {!partner.isVerified && (
            <button
              onClick={() => handleVerify(partner.id)}
              className="px-2.5 py-1 bg-[var(--success)]/10 hover:bg-[var(--success)]/20 text-[var(--success)] rounded text-[10px] font-medium transition-colors"
            >
              Верифицировать
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Briefcase className="w-4 h-4 text-[var(--text-muted)]" />
        <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Управление партнёрами</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <SearchBar placeholder="Поиск по названию..." onSearch={(q) => { setSearch(q); setCurrentPage(1); }} />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">Все категории</option>
          <option value="accommodation">Размещение</option>
          <option value="tour_operator">Туроператор</option>
          <option value="transfer">Трансфер</option>
          <option value="guide">Гид</option>
          <option value="souvenir">Сувениры</option>
          <option value="gear">Снаряжение</option>
          <option value="restaurant">Ресторан</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => { setVerifiedFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="all">Все статусы</option>
          <option value="true">Верифицированные</option>
          <option value="false">Не верифицированные</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка партнёров..." />
        </div>
      ) : partners.length === 0 ? (
        <EmptyState title="Партнёры не найдены" description="Попробуйте изменить фильтры" />
      ) : (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <DataTable columns={columns} data={partners} />
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
