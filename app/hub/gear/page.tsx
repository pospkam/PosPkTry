'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { GearCard } from '@/components/gear/GearCard';
import { GearFilters } from '@/components/gear/GearFilters';
import { GearBookingForm } from '@/components/gear/GearBookingForm';
import { LoadingSpinner } from '@/components/admin/shared';

interface GearItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  pricePerDay: number;
  pricePerWeek?: number;
  imageUrl?: string;
  availableQuantity: number;
  rating?: number;
  condition: 'new' | 'good' | 'fair';
  size?: string;
}

export default function GearHub() {
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 5000 });
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'rating'>('name');
  const [selectedGear, setSelectedGear] = useState<GearItem | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    fetchGear();
  }, []);

  const fetchGear = async () => {
    try {
      setLoading(true);

      // Запрос к API снаряжения
      const response = await fetch('/api/gear?limit=50');
      const result = await response.json();

      if (result.success) {
        setGearItems(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch gear');
      }
    } catch (err) {
      console.error('Error fetching gear:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRent = (gearId: string) => {
    const gear = gearItems.find(g => g.id === gearId);
    if (gear) {
      setSelectedGear(gear);
      setShowBookingForm(true);
    }
  };

  const handleBookingComplete = () => {
    setShowBookingForm(false);
    setSelectedGear(null);
    alert('Заявка на аренду отправлена! Мы свяжемся с вами для подтверждения.');
    fetchGear(); // Обновляем данные
  };

  const handleBackToCatalog = () => {
    setShowBookingForm(false);
    setSelectedGear(null);
  };

  // Фильтрация и сортировка
  const getFilteredAndSortedGear = () => {
    let filtered = gearItems.filter(item => {
      // Фильтр по категории
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Фильтр по цене
      if (item.pricePerDay < priceRange.min || item.pricePerDay > priceRange.max) {
        return false;
      }

      // Фильтр по доступности
      if (showAvailableOnly && item.availableQuantity <= 0) {
        return false;
      }

      return true;
    });

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.pricePerDay - b.pricePerDay;
        case 'price-high':
          return b.pricePerDay - a.pricePerDay;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  };

  const categories = ['all', ...Array.from(new Set(gearItems.map(g => g.category)))];
  const filteredGear = getFilteredAndSortedGear();

  if (loading) {
    return (
      <Protected roles={['tourist', 'admin']}>
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <LoadingSpinner message="Загрузка снаряжения..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['tourist', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        {/* Header */}
        <div className="bg-white/25 border-b border-white/40 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-white">Аренда снаряжения</h1>
              <p className="text-white/70">Профессиональное туристическое оборудование</p>
            </div>

            {showBookingForm && (
              <button
                onClick={handleBackToCatalog}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                ← К каталогу
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {!showBookingForm ? (
            <>
              {/* Filters */}
              <GearFilters
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categories}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                showAvailableOnly={showAvailableOnly}
                onAvailableToggle={setShowAvailableOnly}
                sortBy={sortBy}
                onSortChange={(value) => setSortBy(value as typeof sortBy)}
              />

              {/* Catalog */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGear.map((gear) => (
                  <GearCard
                    key={gear.id}
                    gear={gear}
                    onRent={handleRent}
                  />
                ))}
              </div>

              {filteredGear.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/70 text-lg">Снаряжение не найдено</p>
                  <p className="text-white/50">Попробуйте изменить фильтры</p>
                </div>
              )}
            </>
          ) : selectedGear ? (
            <GearBookingForm
              gear={selectedGear}
              onBookingComplete={handleBookingComplete}
              onCancel={handleBackToCatalog}
            />
          ) : null}
        </div>
      </main>
    </Protected>
  );
}