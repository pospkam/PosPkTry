'use client';

import React, { useState } from 'react';

interface FiltersState {
  type: string[];
  priceMin: number;
  priceMax: number;
  ratingMin: number;
  amenities: string[];
  locationZone: string;
  search: string;
  sort: string;
}

interface AccommodationFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onReset: () => void;
}

const accommodationTypes = [
  { value: 'hotel', label: 'Отель', icon: '🏨' },
  { value: 'hostel', label: 'Хостел', icon: '🏠' },
  { value: 'apartment', label: 'Апартаменты', icon: '' },
  { value: 'guesthouse', label: 'Гостевой дом', icon: '🏡' },
  { value: 'resort', label: 'Курорт', icon: '🏖️' },
  { value: 'camping', label: 'Кемпинг', icon: '⛺' },
  { value: 'glamping', label: 'Глэмпинг', icon: '🏕️' },
  { value: 'cottage', label: 'Коттедж', icon: '🛖' },
];

const amenitiesList = [
  { value: 'wifi', label: 'WiFi', icon: '📶' },
  { value: 'parking', label: 'Парковка', icon: '🅿️' },
  { value: 'breakfast', label: 'Завтрак', icon: '🍳' },
  { value: 'spa', label: 'СПА', icon: '💆' },
  { value: 'pool', label: 'Бассейн', icon: '🏊' },
  { value: 'gym', label: 'Спортзал', icon: '🏋️' },
  { value: 'restaurant', label: 'Ресторан', icon: '🍽️' },
  { value: 'bar', label: 'Бар', icon: '🍸' },
  { value: 'pets', label: 'С животными', icon: '🐕' },
  { value: 'smoking', label: 'Курение', icon: '🚬' },
];

const locationZones = [
  { value: '', label: 'Любая' },
  { value: 'city_center', label: 'Центр города' },
  { value: 'airport', label: 'У аэропорта' },
  { value: 'nature', label: 'На природе' },
  { value: 'beach', label: 'У моря' },
];

const sortOptions = [
  { value: 'rating_desc', label: 'По рейтингу' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
  { value: 'name_asc', label: 'По алфавиту' },
];

export const AccommodationFilters: React.FC<AccommodationFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const handleTypeToggle = (type: string) => {
    const newTypes = filters.type.includes(type)
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type];
    onFiltersChange({ ...filters, type: newTypes });
  };
  
  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    onFiltersChange({ ...filters, amenities: newAmenities });
  };
  
  const handlePriceChange = (min: number, max: number) => {
    onFiltersChange({ ...filters, priceMin: min, priceMax: max });
  };
  
  const activeFiltersCount = 
    filters.type.length +
    filters.amenities.length +
    (filters.priceMin > 0 ? 1 : 0) +
    (filters.priceMax < 50000 ? 1 : 0) +
    (filters.ratingMin > 0 ? 1 : 0) +
    (filters.locationZone ? 1 : 0);
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">Фильтры</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 bg-premium-gold/20 text-premium-gold text-xs font-bold rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onReset}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Сбросить всё
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg
              className={`w-5 h-5 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Filters Content */}
      {isOpen && (
        <div className="p-4 space-y-6">
          {/* Поиск */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Поиск по названию
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              placeholder="Название объекта..."
              className="
                w-full px-4 py-2 rounded-xl
                bg-white/5 border border-white/10
                text-white placeholder-white/40
                focus:outline-none focus:border-premium-gold/50
                transition-colors
              "
            />
          </div>
          
          {/* Тип размещения */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Тип размещения
            </label>
            <div className="grid grid-cols-2 gap-2">
              {accommodationTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleTypeToggle(type.value)}
                  className={`
                    px-3 py-2 rounded-xl text-sm font-medium transition-all
                    flex items-center gap-2
                    ${filters.type.includes(type.value)
                      ? 'bg-premium-gold text-premium-black'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'}
                  `}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Цена */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Цена за ночь
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={filters.priceMin}
                  onChange={(e) => handlePriceChange(Number(e.target.value), filters.priceMax)}
                  placeholder="От"
                  className="
                    w-full px-3 py-2 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-premium-gold/50
                  "
                />
                <span className="text-white/60">—</span>
                <input
                  type="number"
                  value={filters.priceMax}
                  onChange={(e) => handlePriceChange(filters.priceMin, Number(e.target.value))}
                  placeholder="До"
                  className="
                    w-full px-3 py-2 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-premium-gold/50
                  "
                />
              </div>
              
              {/* Quick price buttons */}
              <div className="flex gap-2">
                {[
                  { label: 'До 3000₽', max: 3000 },
                  { label: 'До 5000₽', max: 5000 },
                  { label: 'До 10000₽', max: 10000 },
                ].map(option => (
                  <button
                    key={option.max}
                    onClick={() => handlePriceChange(0, option.max)}
                    className="px-3 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Рейтинг */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Минимальный рейтинг
            </label>
            <div className="flex gap-2">
              {[0, 6, 7, 8, 9].map(rating => (
                <button
                  key={rating}
                  onClick={() => onFiltersChange({ ...filters, ratingMin: rating })}
                  className={`
                    px-4 py-2 rounded-xl font-medium transition-all flex-1
                    ${filters.ratingMin === rating
                      ? 'bg-premium-gold text-premium-black'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'}
                  `}
                >
                  {rating === 0 ? 'Любой' : `${rating}+`}
                </button>
              ))}
            </div>
          </div>
          
          {/* Расположение */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Расположение
            </label>
            <select
              value={filters.locationZone}
              onChange={(e) => onFiltersChange({ ...filters, locationZone: e.target.value })}
              className="
                w-full px-4 py-2 rounded-xl
                bg-white/5 border border-white/10
                text-white
                focus:outline-none focus:border-premium-gold/50
                transition-colors
              "
            >
              {locationZones.map(zone => (
                <option key={zone.value} value={zone.value} className="bg-premium-black">
                  {zone.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Удобства */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Удобства
            </label>
            <div className="grid grid-cols-2 gap-2">
              {amenitiesList.map(amenity => (
                <button
                  key={amenity.value}
                  onClick={() => handleAmenityToggle(amenity.value)}
                  className={`
                    px-3 py-2 rounded-xl text-sm font-medium transition-all
                    flex items-center gap-2
                    ${filters.amenities.includes(amenity.value)
                      ? 'bg-premium-gold text-premium-black'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'}
                  `}
                >
                  <span>{amenity.icon}</span>
                  <span>{amenity.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Сортировка */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Сортировать
            </label>
            <select
              value={filters.sort}
              onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value })}
              className="
                w-full px-4 py-2 rounded-xl
                bg-white/5 border border-white/10
                text-white
                focus:outline-none focus:border-premium-gold/50
                transition-colors
              "
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-premium-black">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccommodationFilters;



