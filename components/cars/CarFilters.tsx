'use client';

import React from 'react';

interface CarFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  priceRange: { min: number; max: number };
  onPriceRangeChange: (range: { min: number; max: number }) => void;
  showAvailableOnly: boolean;
  onAvailableToggle: (showAvailableOnly: boolean) => void;
  transmission: string;
  onTransmissionChange: (transmission: string) => void;
  transmissions: string[];
  fuelType: string;
  onFuelTypeChange: (fuelType: string) => void;
  fuelTypes: string[];
  sortBy: 'name' | 'price-low' | 'price-high' | 'rating';
  onSortChange: (sortBy: string) => void;
}

export function CarFilters({
  selectedCategory,
  onCategoryChange,
  categories,
  priceRange,
  onPriceRangeChange,
  showAvailableOnly,
  onAvailableToggle,
  transmission,
  onTransmissionChange,
  transmissions,
  fuelType,
  onFuelTypeChange,
  fuelTypes,
  sortBy,
  onSortChange
}: CarFiltersProps) {
  const getCategoryText = (category: string) => {
    switch (category) {
      case 'all': return 'Все';
      case 'economy': return 'Эконом';
      case 'comfort': return 'Комфорт';
      case 'business': return 'Бизнес';
      case 'suv': return 'Внедорожник';
      case 'luxury': return 'Люкс';
      default: return category;
    }
  };

  const getTransmissionText = (transmission: string) => {
    switch (transmission) {
      case 'all': return 'Все';
      case 'manual': return 'Механика';
      case 'automatic': return 'Автомат';
      default: return transmission;
    }
  };

  const getFuelTypeText = (fuelType: string) => {
    switch (fuelType) {
      case 'all': return 'Все';
      case 'petrol': return 'Бензин';
      case 'diesel': return 'Дизель';
      case 'electric': return 'Электро';
      case 'hybrid': return 'Гибрид';
      default: return fuelType;
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-bold mb-4">Фильтры и сортировка</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Categories */}
        <div>
          <label className="block text-sm font-medium mb-3">Класс автомобиля</label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {getCategoryText(category)}
              </option>
            ))}
          </select>
        </div>

        {/* Transmission */}
        <div>
          <label className="block text-sm font-medium mb-3">Трансмиссия</label>
          <select
            value={transmission}
            onChange={(e) => onTransmissionChange(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          >
            {transmissions.map((trans) => (
              <option key={trans} value={trans}>
                {getTransmissionText(trans)}
              </option>
            ))}
          </select>
        </div>

        {/* Fuel Type */}
        <div>
          <label className="block text-sm font-medium mb-3">Тип топлива</label>
          <select
            value={fuelType}
            onChange={(e) => onFuelTypeChange(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          >
            {fuelTypes.map((fuel) => (
              <option key={fuel} value={fuel}>
                {getFuelTypeText(fuel)}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium mb-3">Цена за день</label>
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
                  max: parseInt(e.target.value) || 50000
                })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium mb-3">Сортировка</label>
          <select
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

      {/* Additional filters */}
      <div className="mt-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={showAvailableOnly}
            onChange={(e) => onAvailableToggle(e.target.checked)}
            className="text-premium-gold rounded"
          />
          <span>Показывать только доступные автомобили</span>
        </label>
      </div>

      {/* Active Filters Summary */}
      {(selectedCategory !== 'all' || priceRange.min > 0 || priceRange.max < 50000 || showAvailableOnly || transmission !== 'all' || fuelType !== 'all') && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-white/70">Активные фильтры:</span>

            {selectedCategory !== 'all' && (
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-sm flex items-center gap-2">
                {getCategoryText(selectedCategory)}
                <button
                  onClick={() => onCategoryChange('all')}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}

            {transmission !== 'all' && (
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-sm flex items-center gap-2">
                {getTransmissionText(transmission)}
                <button
                  onClick={() => onTransmissionChange('all')}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}

            {fuelType !== 'all' && (
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-sm flex items-center gap-2">
                {getFuelTypeText(fuelType)}
                <button
                  onClick={() => onFuelTypeChange('all')}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}

            {(priceRange.min > 0 || priceRange.max < 50000) && (
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-sm flex items-center gap-2">
                {priceRange.min > 0 ? `${priceRange.min}₽` : ''} - {priceRange.max < 50000 ? `${priceRange.max}₽` : '∞'}
                <button
                  onClick={() => onPriceRangeChange({ min: 0, max: 50000 })}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}

            {showAvailableOnly && (
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-sm flex items-center gap-2">
                Только доступные
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
