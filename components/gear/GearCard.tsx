'use client';

import React from 'react';
import Image from 'next/image';

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

interface GearCardProps {
  gear: GearItem;
  onRent: (id: string) => void;
}

export function GearCard({ gear, onRent }: GearCardProps) {
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'text-green-400';
      case 'good': return 'text-yellow-400';
      case 'fair': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'new': return 'Новое';
      case 'good': return 'Хорошее';
      case 'fair': return 'Удовлетворительное';
      default: return condition;
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all hover:scale-105">
      {/* Image */}
      <div className="relative h-48 bg-white/10">
        {gear.imageUrl ? (
          <Image
            src={gear.imageUrl}
            alt={gear.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🎒
          </div>
        )}

        {/* Condition badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded-full">
          <span className={`text-xs font-medium ${getConditionColor(gear.condition)}`}>
            {getConditionText(gear.condition)}
          </span>
        </div>

        {/* Availability badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
          gear.availableQuantity > 0
            ? 'bg-green-500/90 text-white'
            : 'bg-red-500/90 text-white'
        }`}>
          {gear.availableQuantity > 0 ? `В наличии: ${gear.availableQuantity}` : 'Нет в наличии'}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2">
          <span className="text-xs text-white/50">{gear.category}</span>
          {gear.size && (
            <span className="text-xs text-premium-gold ml-2">Размер: {gear.size}</span>
          )}
        </div>

        <h3 className="font-bold text-lg mb-2 text-white line-clamp-2">
          {gear.name}
        </h3>

        {gear.description && (
          <p className="text-white/70 text-sm mb-4 line-clamp-2">
            {gear.description}
          </p>
        )}

        {gear.rating && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-white/70 text-sm">{gear.rating.toFixed(1)}</span>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/70">Цена за день:</span>
            <span className="text-lg font-bold text-premium-gold">
              {gear.pricePerDay.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          {gear.pricePerWeek && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Цена за неделю:</span>
              <span className="text-sm text-white/50 line-through">
                {(gear.pricePerDay * 7).toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-premium-gold font-semibold">
                {gear.pricePerWeek.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => onRent(gear.id)}
          disabled={gear.availableQuantity <= 0}
          className="w-full px-4 py-3 bg-premium-gold hover:bg-premium-gold/80 disabled:opacity-50 disabled:cursor-not-allowed text-premium-black font-semibold rounded-lg transition-colors"
        >
          {gear.availableQuantity > 0 ? 'Забронировать' : 'Нет в наличии'}
        </button>
      </div>
    </div>
  );
}