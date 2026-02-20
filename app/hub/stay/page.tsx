'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { PublicNav } from '@/components/shared/PublicNav';
import { AccommodationCard } from '@/components/AccommodationCard';
import { AccommodationCardSkeleton } from '@/components/AccommodationCardSkeleton';
import { AccommodationFilters } from '@/components/AccommodationFilters';
import { Star } from 'lucide-react';

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

export default function StayHub() {
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
      console.error('Error fetching accommodations:', error);
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
    <Protected roles={['tourist', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <PublicNav />
        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <h1 className="text-3xl font-black text-white">Размещение</h1>
          <p className="text-white/70">Найдите идеальное место для отдыха на Камчатке</p>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 border-b border-white/15">
          <div className="flex space-x-4">
            {[
              { id: 'properties', label: 'Объекты', count: accommodations.length },
              { id: 'bookings', label: 'Мои бронирования' },
              { id: 'favorites', label: 'Избранное', count: favorites.length },
              { id: 'reviews', label: 'Отзывы' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-premium-gold text-premium-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-transparent/20'
                      : 'bg-white/20'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'properties' && (
            <div className="grid grid-cols-12 gap-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, skeletonIndex) => (
                      <AccommodationCardSkeleton key={`skeleton-${skeletonIndex}`} />
                    ))}
                  </div>
                ) : accommodations.length > 0 ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-white/70">
                        Найдено объектов: <span className="text-white font-bold">{accommodations.length}</span>
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      <div className="mt-8 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Назад
                        </button>
                        <span className="px-4 py-2 text-white/70">
                          Страница {page} из {totalPages}
                        </span>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Вперёд
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white/15 border border-white/15 rounded-2xl p-12">
                    <div className="text-center text-white/70">
                      <div className="text-6xl mb-4">🏨</div>
                      <h3 className="text-xl font-bold text-white mb-2">Объекты не найдены</h3>
                      <p className="mb-4">Попробуйте изменить параметры поиска</p>
                      <button
                        onClick={handleFiltersReset}
                        className="px-6 py-3 rounded-xl bg-premium-gold text-premium-black font-bold hover:bg-premium-gold/90 transition-colors"
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
              <h2 className="text-xl font-bold">Мои бронирования</h2>
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <div className="text-center text-white/70 py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <p>Здесь будут отображаться ваши бронирования</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Избранное ({favorites.length})</h2>
              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                  <div className="text-center text-white/70 py-8">
                    <div className="text-4xl mb-2">❤️</div>
                    <p>Здесь появятся избранные объекты</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Отзывы</h2>
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                <div className="text-center text-white/70 py-8">
                  <div className="text-4xl mb-2"><Star className="w-4 h-4" /></div>
                  <p>Здесь будут ваши отзывы об объектах</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}