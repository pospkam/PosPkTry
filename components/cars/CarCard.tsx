'use client';

import React from 'react';
import Image from 'next/image';
import { Car, Fuel, Users, Star } from 'lucide-react';

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

interface CarCardProps {
  car: Car;
  onRent: (id: string) => void;
}

export function CarCard({ car, onRent }: CarCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'economy': return 'text-green-400';
      case 'comfort': return 'text-blue-400';
      case 'business': return 'text-purple-400';
      case 'suv': return 'text-orange-400';
      case 'luxury': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'economy': return 'Эконом';
      case 'comfort': return 'Комфорт';
      case 'business': return 'Бизнес';
      case 'suv': return 'Внедорожник';
      case 'luxury': return 'Люкс';
      default: return category;
    }
  };

  const getTransmissionText = (transmission: string) => {
    return transmission === 'automatic' ? 'Автомат' : 'Механика';
  };

  const getFuelTypeText = (fuelType: string) => {
    switch (fuelType) {
      case 'petrol': return 'Бензин';
      case 'diesel': return 'Дизель';
      case 'electric': return 'Электро';
      case 'hybrid': return 'Гибрид';
      default: return fuelType;
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all hover:scale-105">
      {/* Image */}
      <div className="relative h-48 bg-white/10">
        {car.imageUrl ? (
          <Image
            src={car.imageUrl}
            alt={`${car.brand} ${car.model}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-16 h-16 text-white/40" />
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded-full">
          <span className={`text-xs font-medium ${getCategoryColor(car.category)}`}>
            {getCategoryText(car.category)}
          </span>
        </div>

        {/* Availability badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
          car.isAvailable
            ? 'bg-green-500/90 text-white'
            : 'bg-red-500/90 text-white'
        }`}>
          {car.isAvailable ? 'Доступен' : 'Занят'}
        </div>

        {/* Year badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded-full">
          <span className="text-xs text-white">{car.year}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2">
          <h3 className="font-bold text-lg">{car.brand} {car.model}</h3>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <span>{getTransmissionText(car.transmission)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Fuel className="w-4 h-4" />
            <span>{getFuelTypeText(car.fuelType)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{car.seats} мест</span>
          </div>
          {car.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>{car.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Features */}
        {car.features && car.features.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {car.features.slice(0, 3).map((feature) => (
                <span
                  key={feature}
                  className="px-2 py-1 bg-white/10 rounded text-xs text-white/70"
                >
                  {feature}
                </span>
              ))}
              {car.features.length > 3 && (
                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/50">
                  +{car.features.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/70">Цена за день:</span>
            <span className="text-lg font-bold text-premium-gold">
              {car.pricePerDay.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          {car.pricePerWeek && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Цена за неделю:</span>
              <span className="text-sm text-white/50 line-through">
                {(car.pricePerDay * 7).toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-premium-gold font-semibold">
                {car.pricePerWeek.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}

          {car.pricePerMonth && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Цена за месяц:</span>
              <span className="text-sm text-white/50 line-through">
                {(car.pricePerDay * 30).toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-premium-gold font-semibold">
                {car.pricePerMonth.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}
        </div>

        {/* Deposit */}
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/70">Залог:</span>
            <span className="text-orange-400 font-semibold">
              {car.deposit.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        <button
          onClick={() => onRent(car.id)}
          disabled={!car.isAvailable}
          className="w-full px-4 py-3 bg-premium-gold hover:bg-premium-gold/80 disabled:opacity-50 disabled:cursor-not-allowed text-premium-black font-semibold rounded-lg transition-colors"
        >
          {car.isAvailable ? 'Забронировать' : 'Недоступен'}
        </button>
      </div>
    </div>
  );
}