'use client';

import React, { useState, useEffect } from 'react';
import { CarCard } from '@/components/cars/CarCard';
import { CarFilters } from '@/components/cars/CarFilters';
import { CarBookingForm } from '@/components/cars/CarBookingForm';
import { LoadingSpinner } from '@/components/admin/shared';
import toast from 'react-hot-toast';

interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  transmission: 'manual' | 'automatic';
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  seats: number;
  pricePerDay: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  imageUrl?: string;
  isAvailable: boolean;
  rating?: number;
  category: 'economy' | 'comfort' | 'business' | 'suv' | 'luxury';
  features: string[];
  deposit: number;
}

export default function CarsHubClient() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'catalog' | 'booking'>('catalog');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [transmission, setTransmission] = useState<string>('all');
  const [fuelType, setFuelType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'rating'>('name');

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      setLoading(true);

      // Запрос к API автомобилей
      const response = await fetch('/api/cars?limit=50');
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setCars(result.data);
      } else {
        setCars([]);
      }
    } catch (err) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleRent = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    if (car) {
      setSelectedCar(car);
      setView('booking');
    }
  };

  const handleBookingComplete = () => {
    setView('catalog');
    setSelectedCar(null);
    toast.success('Заявка на аренду автомобиля отправлена! Мы свяжемся с вами для подтверждения.');
    fetchCars(); // Обновляем данные
  };

  const handleBackToCatalog = () => {
    setView('catalog');
    setSelectedCar(null);
  };

  // Фильтрация и сортировка
  const getFilteredAndSortedCars = () => {
    const filtered = cars.filter(car => {
      // Фильтр по категории
      if (selectedCategory !== 'all' && car.category !== selectedCategory) {
        return false;
      }

      // Фильтр по цене
      if (car.pricePerDay < priceRange.min || car.pricePerDay > priceRange.max) {
        return false;
      }

      // Фильтр по доступности
      if (showAvailableOnly && !car.isAvailable) {
        return false;
      }

      // Фильтр по трансмиссии
      if (transmission !== 'all' && car.transmission !== transmission) {
        return false;
      }

      // Фильтр по типу топлива
      if (fuelType !== 'all' && car.fuelType !== fuelType) {
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
          return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
      }
    });

    return filtered;
  };

  const categories = ['all', 'economy', 'comfort', 'business', 'suv', 'luxury'];
  const transmissions = ['all', 'manual', 'automatic'];
  const fuelTypes = ['all', 'petrol', 'diesel', 'electric', 'hybrid'];
  const filteredCars = getFilteredAndSortedCars();

  if (loading) {
    return (
      <div className="p-5 lg:p-6 flex items-center justify-center min-h-[300px]">
        <LoadingSpinner message="Загрузка автомобилей..." />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Аренда автомобилей</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Надежный транспорт для путешествий</p>
          </div>

          {view === 'booking' && (
            <button
              onClick={handleBackToCatalog}
              className="px-4 py-2 text-sm border border-[var(--border)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-primary)] transition-colors"
            >
              ← К каталогу
            </button>
          )}
        </div>
      </div>

      {view === 'catalog' ? (
        <>
          {/* Filters */}
          <CarFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categories}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            showAvailableOnly={showAvailableOnly}
            onAvailableToggle={setShowAvailableOnly}
            transmission={transmission}
            onTransmissionChange={setTransmission}
            transmissions={transmissions}
            fuelType={fuelType}
            onFuelTypeChange={setFuelType}
            fuelTypes={fuelTypes}
            sortBy={sortBy}
            onSortChange={(value) => setSortBy(value as typeof sortBy)}
          />

          {/* Catalog */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onRent={handleRent}
              />
            ))}
          </div>

          {filteredCars.length === 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
              <p className="text-[var(--text-muted)] mb-1">Автомобили не найдены</p>
              <p className="text-sm text-[var(--text-muted)]">Попробуйте изменить фильтры</p>
            </div>
          )}
        </>
      ) : selectedCar ? (
        <CarBookingForm
          car={selectedCar}
          onBookingComplete={handleBookingComplete}
          onCancel={handleBackToCatalog}
        />
      ) : null}
    </div>
  );
}
