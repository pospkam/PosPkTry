'use client';

import React, { useState, useEffect } from 'react';
import { TransferSearchRequest, TransferOption, TransferSearchResponse } from '@/types/transfer';

interface TransferSearchWidgetProps {
  className?: string;
  onSearchResults?: (results: TransferOption[]) => void;
}

export function TransferSearchWidget({ className, onSearchResults }: TransferSearchWidgetProps) {
  const [searchParams, setSearchParams] = useState<TransferSearchRequest>({
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    passengers: 1,
    vehicleType: undefined,
    budgetMin: undefined,
    budgetMax: undefined,
    features: [],
    languages: []
  });

  const [searchResults, setSearchResults] = useState<TransferOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Функция для выполнения поиска
  const handleSearch = async () => {
    if (!searchParams.from || !searchParams.to || !searchParams.date) {
      setError('Заполните все обязательные поля');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('from', searchParams.from);
      params.append('to', searchParams.to);
      params.append('date', searchParams.date);
      params.append('passengers', searchParams.passengers.toString());
      
      if (searchParams.vehicleType) {
        params.append('vehicle_type', searchParams.vehicleType);
      }
      if (searchParams.budgetMin) {
        params.append('budget_min', searchParams.budgetMin.toString());
      }
      if (searchParams.budgetMax) {
        params.append('budget_max', searchParams.budgetMax.toString());
      }
      if (searchParams.features && searchParams.features.length > 0) {
        params.append('features', searchParams.features.join(','));
      }
      if (searchParams.languages && searchParams.languages.length > 0) {
        params.append('languages', searchParams.languages.join(','));
      }

      const response = await fetch(`/api/transfers/search?${params.toString()}`);
      const data: TransferSearchResponse = await response.json();

      if (data.success && data.data) {
        setSearchResults(data.data.availableTransfers);
        onSearchResults?.(data.data.availableTransfers);
      } else {
        setError(data.error || 'Ошибка при поиске трансферов');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для обновления параметров поиска
  const updateSearchParam = (key: keyof TransferSearchRequest, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Функция для переключения фильтров
  const toggleFeature = (feature: string) => {
    const currentFeatures = searchParams.features || [];
    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter(f => f !== feature)
      : [...currentFeatures, feature];
    updateSearchParam('features', newFeatures);
  };

  const toggleLanguage = (language: string) => {
    const currentLanguages = searchParams.languages || [];
    const newLanguages = currentLanguages.includes(language)
      ? currentLanguages.filter(l => l !== language)
      : [...currentLanguages, language];
    updateSearchParam('languages', newLanguages);
  };

  return (
    <div className={`bg-premium-black/90 backdrop-blur-sm rounded-2xl p-6 border border-premium-gold/20 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-premium-gold mb-2">
            Поиск трансферов
        </h2>
        <p className="text-white/70">
          Найдите подходящий трансфер для вашей поездки
        </p>
      </div>

      {/* Основные поля поиска */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label htmlFor="transfer-from" className="block text-sm font-medium text-white mb-2">
            Откуда *
          </label>
          <input
            id="transfer-from"
            value={searchParams.from}
            onChange={(e) => updateSearchParam('from', e.target.value)}
            placeholder="Аэропорт, отель, адрес..."
            className="w-full px-4 py-3 bg-premium-black/50 border border-premium-gold/30 rounded-xl text-white placeholder-white/50 focus:border-premium-gold focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="transfer-to" className="block text-sm font-medium text-white mb-2">
            Куда *
          </label>
          <input
            id="transfer-to"
            value={searchParams.to}
            onChange={(e) => updateSearchParam('to', e.target.value)}
            placeholder="Аэропорт, отель, адрес..."
            className="w-full px-4 py-3 bg-premium-black/50 border border-premium-gold/30 rounded-xl text-white placeholder-white/50 focus:border-premium-gold focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="transfer-date" className="block text-sm font-medium text-white mb-2">
            Дата *
          </label>
          <input
            id="transfer-date"
            value={searchParams.date}
            onChange={(e) => updateSearchParam('date', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 bg-premium-black/50 border border-premium-gold/30 rounded-xl text-white focus:border-premium-gold focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="transfer-passengers" className="block text-sm font-medium text-white mb-2">
            Пассажиры *
          </label>
          <select
            id="transfer-passengers"
            value={searchParams.passengers}
            onChange={(e) => updateSearchParam('passengers', parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-premium-black/50 border border-premium-gold/30 rounded-xl text-white focus:border-premium-gold focus:outline-none transition-colors"
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num} className="bg-premium-black text-white">
                {num} {num === 1 ? 'пассажир' : num < 5 ? 'пассажира' : 'пассажиров'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Кнопка расширенных фильтров */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-premium-gold hover:text-premium-gold/80 transition-colors"
        >
          <span className="text-lg">
            {showFilters ? '🔽' : '▶️'}
          </span>
          <span className="font-medium">
            {showFilters ? 'Скрыть фильтры' : 'Расширенные фильтры'}
          </span>
        </button>
      </div>

      {/* Расширенные фильтры */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 p-4 bg-premium-black/30 rounded-xl border border-premium-gold/10">
          {/* Тип транспорта */}
          <div>
            <label htmlFor="transfer-vehicle-type" className="block text-sm font-medium text-white mb-3">
              Тип транспорта
            </label>
            <select
              id="transfer-vehicle-type"
              value={searchParams.vehicleType || ''}
              onChange={(e) => updateSearchParam('vehicleType', e.target.value || undefined)}
              className="w-full px-4 py-3 bg-premium-black/50 border border-premium-gold/30 rounded-xl text-white focus:border-premium-gold focus:outline-none transition-colors"
            >
              <option value="" className="bg-premium-black text-white">Любой</option>
              <option value="economy" className="bg-premium-black text-white">Эконом</option>
              <option value="comfort" className="bg-premium-black text-white">Комфорт</option>
              <option value="business" className="bg-premium-black text-white">Бизнес</option>
              <option value="minibus" className="bg-premium-black text-white">Микроавтобус</option>
              <option value="bus" className="bg-premium-black text-white">Автобус</option>
            </select>
          </div>

          {/* Бюджет */}
          <div>
            <span className="block text-sm font-medium text-white mb-3">
              Бюджет (руб.)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="От"
                value={searchParams.budgetMin || ''}
                onChange={(e) => updateSearchParam('budgetMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="px-3 py-2 bg-premium-black/50 border border-premium-gold/30 rounded-lg text-white placeholder-white/50 focus:border-premium-gold focus:outline-none transition-colors"
              />
              <input
                type="number"
                placeholder="До"
                value={searchParams.budgetMax || ''}
                onChange={(e) => updateSearchParam('budgetMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="px-3 py-2 bg-premium-black/50 border border-premium-gold/30 rounded-lg text-white placeholder-white/50 focus:border-premium-gold focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Функции */}
          <div>
            <span className="block text-sm font-medium text-white mb-3">
              Функции
            </span>
            <div className="space-y-2">
              {[
                { key: 'wifi', label: 'Wi-Fi' },
                { key: 'air_conditioning', label: 'Кондиционер' },
                { key: 'child_seat', label: 'Детское кресло' },
                { key: 'wheelchair_accessible', label: 'Доступ для инвалидов' }
              ].map(feature => (
                <label key={feature.key} className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={searchParams.features?.includes(feature.key) || false}
                    onChange={() => toggleFeature(feature.key)}
                    className="w-4 h-4 text-premium-gold bg-premium-black/50 border-premium-gold/30 rounded focus:ring-premium-gold focus:ring-2"
                  />
                  <span className="text-sm">{feature.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Языки водителя */}
          <div>
            <span className="block text-sm font-medium text-white mb-3">
              Языки водителя
            </span>
            <div className="space-y-2">
              {[
                { key: 'ru', label: 'Русский' },
                { key: 'en', label: 'Английский' },
                { key: 'zh', label: 'Китайский' },
                { key: 'ja', label: 'Японский' }
              ].map(language => (
                <label key={language.key} className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={searchParams.languages?.includes(language.key) || false}
                    onChange={() => toggleLanguage(language.key)}
                    className="w-4 h-4 text-premium-gold bg-premium-black/50 border-premium-gold/30 rounded focus:ring-premium-gold focus:ring-2"
                  />
                  <span className="text-sm">{language.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Кнопка поиска */}
      <div className="flex justify-center">
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-8 py-4 bg-premium-gold hover:bg-premium-gold/90 text-premium-black font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-premium-black border-t-transparent rounded-full animate-spin"></div>
              <span>Поиск...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Найти трансферы</span>
            </>
          )}
        </button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Результаты поиска */}
      {searchResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Найдено трансферов: {searchResults.length}
          </h3>
          <div className="space-y-4">
            {searchResults.map((transfer) => (
              <TransferCard key={transfer.id || transfer.scheduleId} transfer={transfer} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Компонент карточки трансфера
function TransferCard({ transfer }: { transfer: TransferOption }) {
  const [isBooking, setIsBooking] = useState(false);

  const handleBooking = async () => {
    setIsBooking(true);
    // Здесь будет логика бронирования
    console.log('Booking transfer:', transfer.scheduleId);
    // Временная заглушка
    setTimeout(() => {
      setIsBooking(false);
      alert('Функция бронирования будет реализована в следующем этапе');
    }, 1000);
  };

  const getVehicleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      economy: 'Эконом',
      comfort: 'Комфорт',
      business: 'Бизнес',
      minibus: 'Микроавтобус',
      bus: 'Автобус'
    };
    return labels[type] || type;
  };

  const getVehicleTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      economy: ' ',
      comfort: '🚙',
      business: '🚘',
      minibus: '🚐',
      bus: ' '
    };
    return icons[type] || ' ';
  };

  return (
    <div className="bg-premium-black/50 border border-premium-gold/20 rounded-xl p-4 hover:border-premium-gold/40 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getVehicleTypeIcon(transfer.vehicle.vehicleType)}</span>
          <div>
            <h4 className="text-lg font-bold text-white">
              {getVehicleTypeLabel(transfer.vehicle.vehicleType)} • {transfer.vehicle.make} {transfer.vehicle.model}
            </h4>
            <p className="text-white/70 text-sm">
              {transfer.vehicle.licensePlate} • {transfer.vehicle.capacity} мест
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-premium-gold">
            {transfer.pricePerPerson.toLocaleString()} ₽
          </div>
          <div className="text-white/70 text-sm">
            за человека
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-2 text-white/80">
          <span>🕐</span>
          <span className="text-sm">
            {transfer.departureTime} - {transfer.arrivalTime}
          </span>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <span> </span>
          <span className="text-sm">{transfer.driver.name}</span>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <span>★</span>
          <span className="text-sm">{transfer.driver.rating}/5</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {transfer.features.map(feature => (
            <span
              key={feature}
              className="px-2 py-1 bg-premium-gold/20 text-premium-gold text-xs rounded-full"
            >
              {feature}
            </span>
          ))}
        </div>
        <button
          onClick={handleBooking}
          disabled={isBooking}
          className="px-6 py-2 bg-premium-gold hover:bg-premium-gold/90 text-premium-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBooking ? 'Бронирование...' : 'Забронировать'}
        </button>
      </div>
    </div>
  );
}