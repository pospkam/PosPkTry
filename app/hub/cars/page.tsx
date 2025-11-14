'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { CarCard } from '@/components/cars/CarCard';
import { CarFilters } from '@/components/cars/CarFilters';
import { CarBookingForm } from '@/components/cars/CarBookingForm';
import { LoadingSpinner } from '@/components/admin/shared';

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

export default function CarsHub() {
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
        console.error('No cars data:', result);
      }
    } catch (err) {
      console.error('Error fetching cars:', err);
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
    alert('Заявка на аренду автомобиля отправлена! Мы свяжемся с вами для подтверждения.');
    fetchCars(); // Обновляем данные
  };

  const handleBackToCatalog = () => {
    setView('catalog');
    setSelectedCar(null);
  };

  // Фильтрация и сортировка
  const getFilteredAndSortedCars = () => {
    let filtered = cars.filter(car => {
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
      <Protected roles={['tourist', 'admin']}>
        <div className="min-h-screen bg-premium-black flex items-center justify-center">
          <LoadingSpinner message="Загрузка автомобилей..." />
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['tourist', 'admin']}>
      <main className="min-h-screen bg-premium-black text-white">
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-premium-gold">Аренда автомобилей</h1>
              <p className="text-white/70">Надежный транспорт для путешествий</p>
            </div>

            {view === 'booking' && (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onRent={handleRent}
                  />
                ))}
              </div>

              {filteredCars.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/70 text-lg">Автомобили не найдены</p>
                  <p className="text-white/50">Попробуйте изменить фильтры</p>
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
      </main>
    </Protected>
  );
}