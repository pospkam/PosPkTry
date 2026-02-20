'use client';

import React from 'react';

interface GearFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  priceRange: { min: number; max: number };
  onPriceRangeChange: (range: { min: number; max: number }) => void;
  showAvailableOnly: boolean;
  onAvailableToggle: (showAvailableOnly: boolean) => void;
  sortBy: 'name' | 'price-low' | 'price-high' | 'rating';
  onSortChange: (sortBy: string) => void;
}

export function GearFilters({
  selectedCategory,
  onCategoryChange,
  categories,
  priceRange,
  onPriceRangeChange,
  showAvailableOnly,
  onAvailableToggle,
  sortBy,
  onSortChange
}: GearFiltersProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-bold mb-4">Фильтры и сортировка</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Categories */}
        <div>
          <label htmlFor="gear-category" className="block text-sm font-medium mb-3">Категория</label>
          <select
            id="gear-category"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          >
            <option value="all">Все категории</option>
            {categories.filter(cat => cat !== 'all').map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <span className="block text-sm font-medium mb-3">Цена за день</span>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="От"
                value={priceRange.min || ''}
                onChange={(e) => onPriceRangeChange({
                  ...priceRange,
                  min: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
              <input
                type="number"
                placeholder="До"
                value={priceRange.max || ''}
                onChange={(e) => onPriceRangeChange({
                  ...priceRange,
                  max: parseInt(e.target.value) || 10000
                })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>
          </div>
        </div>

        {/* Availability */}
        <div>
          <span className="block text-sm font-medium mb-3">Доступность</span>
          <label htmlFor="gear-available" className="flex items-center gap-3">
            <input
              id="gear-available"
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => onAvailableToggle(e.target.checked)}
              className="text-premium-gold rounded"
            />
            <span>Только доступное</span>
          </label>
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="gear-sort" className="block text-sm font-medium mb-3">Сортировка</label>
          <select
            id="gear-sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          >
            <option value="name">По названию</option>
            <option value="price-low">По цене (дешевле)</option>
            <option value="price-high">По цене (дороже)</option>
            <option value="rating">По рейтингу</option>
          </select>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(selectedCategory !== 'all' || priceRange.min > 0 || priceRange.max < 10000 || showAvailableOnly) && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-white/70">Активные фильтры:</span>

            {selectedCategory !== 'all' && (
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-sm flex items-center gap-2">
                {selectedCategory}
                <button
                  onClick={() => onCategoryChange('all')}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}

            {(priceRange.min > 0 || priceRange.max < 10000) && (
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-sm flex items-center gap-2">
                {priceRange.min > 0 ? `${priceRange.min}₽` : ''} - {priceRange.max < 10000 ? `${priceRange.max}₽` : '∞'}
                <button
                  onClick={() => onPriceRangeChange({ min: 0, max: 10000 })}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}

            {showAvailableOnly && (
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-sm flex items-center gap-2">
                Только доступное
                <button
                  onClick={() => onAvailableToggle(false)}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
