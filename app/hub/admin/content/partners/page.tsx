'use client';

import React, { useState, useEffect } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { AdminNav } from '@/components/admin/AdminNav';
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
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);

      const response = await fetch(`/api/admin/content/partners?${params}`);
      const result = await response.json();

      if (result.success) {
        setPartners(result.data.data);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (partnerId: string) => {
    try {
      const response = await fetch(`/api/admin/content/partners/${partnerId}/verify`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchPartners();
      }
    } catch (error) {
      console.error('Error verifying partner:', error);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      accommodation: 'Размещение',
      tour_operator: 'Туроператор',
      transfer: 'Трансфер',
      guide: 'Гид',
      souvenir: 'Сувениры',
      gear: 'Снаряжение',
      restaurant: 'Ресторан'
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
            <img
              src={partner.logo.url}
              alt={partner.name}
              className="w-10 h-10 rounded-lg mr-3 object-cover"
            />
          )}
          <div>
            <p className="font-semibold text-white">{partner.name}</p>
            <p className="text-xs text-white/60">{getCategoryLabel(partner.category)}</p>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      title: 'Контакт',
      render: (partner) => (
        <span className="text-white/80">{partner.contact || '—'}</span>
      )
    },
    {
      key: 'rating',
      title: 'Рейтинг',
      render: (partner) => (
        <div className="text-sm">
          <span className="text-yellow-400">★</span> {partner.rating.toFixed(1)}
          <span className="text-white/50 text-xs"> ({partner.reviewCount})</span>
        </div>
      )
    },
    {
      key: 'isVerified',
      title: 'Статус',
      render: (partner) => (
        <StatusBadge status={partner.isVerified ? 'success' : 'pending'} />
      )
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (partner) => (
        <div>
          {!partner.isVerified && (
            <button
              onClick={() => handleVerify(partner.id)}
              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors"
            >
              Верифицировать
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <AdminProtected>
      <main className="min-h-screen bg-transparent text-white">
        <AdminNav />
        
        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black text-white">
                  Управление партнёрами
                </h1>
                <p className="text-white/70 mt-1">
                  Верификация и модерация партнёров
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchBar
                  placeholder="Поиск по названию..."
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
                className="px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                onChange={(e) => {
                  setVerifiedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <option value="all">Все статусы</option>
                <option value="true">Верифицированные</option>
                <option value="false">Не верифицированные</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка партнёров..." />
            </div>
          ) : partners.length === 0 ? (
            <EmptyState
              title="Партнёры не найдены"
              description="Попробуйте изменить фильтры или условия поиска"
            />
          ) : (
            <div className="space-y-6">
              <DataTable
                columns={columns}
                data={partners}
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
    </AdminProtected>
  );
}

