'use client';

import React, { useState, useEffect } from 'react';
import { AccommodationCard } from '@/components/shared/AccommodationCard';
import { AccommodationCardSkeleton } from '@/components/shared/AccommodationCardSkeleton';
import { AccommodationFilters } from '@/components/shared/AccommodationFilters';
import { Star, Building2, ClipboardList, Heart } from 'lucide-react';

interface Accommodation {
  id: string;
  name: string;
  type: string;
  description: string;
  address: string;
  pricePerNight: {
    from: number;
    to?: number | null;
    currency: string;
  };
  rating: number;
  reviewCount: number;
  amenities: string[];
  images: Array<{ url: string; alt?: string }>;
  starRating?: number;
}

export default function StayHubClient() {
  const [activeTab, setActiveTab] = useState('properties');
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: [] as string[],
    priceMin: 0,
    priceMax: 50000,
    ratingMin: 0,
    amenities: [] as string[],
    locationZone: '',
    search: '',
    sort: 'rating_desc',
  });

  // Загрузка объектов
  const fetchAccommodations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '12');

      if (filters.type.length > 0) {
        params.append('type', filters.type[0]); // API принимает один тип
      }
      if (filters.priceMin > 0) {
        params.append('price_min', filters.priceMin.toString());
      }
      if (filters.priceMax < 50000) {
        params.append('price_max', filters.priceMax.toString());
      }
      if (filters.ratingMin > 0) {
        params.append('rating_min', filters.ratingMin.toString());
      }
      if (filters.amenities.length > 0) {
        params.append('amenities', filters.amenities.join(','));
      }
      if (filters.locationZone) {
        params.append('location_zone', filters.locationZone);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.sort) {
        params.append('sort', filters.sort);
      }

      const response = await fetch(`/api/accommodations?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAccommodations(data.data.accommodations);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'properties') {
      fetchAccommodations();
    }
  }, [activeTab, page, filters]);

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1); // Сбросить на первую страницу
  };

  const handleFiltersReset = () => {
    setFilters({
      type: [],
      priceMin: 0,
      priceMax: 50000,
      ratingMin: 0,
      amenities: [],
      locationZone: '',
      search: '',
      sort: 'rating_desc',
    });
    setPage(1);
  };

  const handleFavoriteToggle = (id: string) => {
    setFavorites(prev =>
      prev.includes(id)
        ? prev.filter(fav => fav !== id)
        : [...prev, id]
    );
    // TODO: Сохранить в API
  };

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Размещение</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Найдите идеальное место для отдыха на Камчатке</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {[
          { id: 'properties', label: 'Объекты', count: accommodations.length },
          { id: 'bookings', label: 'Мои бронирования' },
          { id: 'favorites', label: 'Избранное', count: favorites.length },
          { id: 'reviews', label: 'Отзывы' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-[var(--bg-card)]/20'
                  : 'bg-[var(--bg-primary)]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'properties' && (
        <div className="grid grid-cols-12 gap-5">
          {/* Фильтры */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-6">
              <AccommodationFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onReset={handleFiltersReset}
              />
            </div>
          </div>

          {/* Список объектов */}
          <div className="col-span-12 lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, skeletonIndex) => (
                  <AccommodationCardSkeleton key={`skeleton-${skeletonIndex}`} />
                ))}
              </div>
            ) : accommodations.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-[var(--text-muted)]">
                    Найдено объектов: <span className="font-semibold text-[var(--text-primary)]">{accommodations.length}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {accommodations.map(accommodation => (
                    <AccommodationCard
                      key={accommodation.id}
                      {...accommodation}
                      isFavorite={favorites.includes(accommodation.id)}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>

                {/* Пагинация */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Назад
                    </button>
                    <span className="px-4 py-2 text-sm text-[var(--text-muted)]">
                      Страница {page} из {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Вперёд
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12">
                <div className="text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Объекты не найдены</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-4">Попробуйте изменить параметры поиска</p>
                  <button
                    onClick={handleFiltersReset}
                    className="px-5 py-2.5 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Мои бронирования</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            <div className="text-center text-[var(--text-muted)] py-8">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-sm">Здесь будут отображаться ваши бронирования</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Избранное ({favorites.length})</h2>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {accommodations
                .filter(acc => favorites.includes(acc.id))
                .map(accommodation => (
                  <AccommodationCard
                    key={accommodation.id}
                    {...accommodation}
                    isFavorite={true}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
              <div className="text-center text-[var(--text-muted)] py-8">
                <Heart className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                <p className="text-sm">Здесь появятся избранные объекты</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Отзывы</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            <div className="text-center text-[var(--text-muted)] py-8">
              <Star className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-sm">Здесь будут ваши отзывы об объектах</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
