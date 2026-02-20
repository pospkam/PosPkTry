'use client';

// ===========================================
// ВЫБОР КОЛИЧЕСТВА ГОСТЕЙ
// KamHub - Guest Selector Component
// ===========================================

import React, { useState } from 'react';
import clsx from 'clsx';

export interface GuestSelectorProps {
  // Максимальное количество гостей
  maxGuests?: number;
  maxChildren?: number;
  
  // Начальные значения
  initialAdults?: number;
  initialChildren?: number;
  
  // Callback при изменении
  onChange: (adults: number, children: number, childrenAges: number[]) => void;
  
  // Требовать возраст детей
  requireChildrenAges?: boolean;
  
  // UI
  className?: string;
}

export const GuestSelector: React.FC<GuestSelectorProps> = ({
  maxGuests = 20,
  maxChildren = 10,
  initialAdults = 2,
  initialChildren = 0,
  onChange,
  requireChildrenAges = false,
  className,
}) => {
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [showAges, setShowAges] = useState(requireChildrenAges && initialChildren > 0);

  const handleAdultsChange = (newValue: number) => {
    const value = Math.max(1, Math.min(maxGuests, newValue));
    setAdults(value);
    
    // Проверяем, не превышает ли общее количество максимум
    const totalGuests = value + children;
    if (totalGuests > maxGuests) {
      const adjustedChildren = maxGuests - value;
      setChildren(adjustedChildren);
      onChange(value, adjustedChildren, childrenAges.slice(0, adjustedChildren));
    } else {
      onChange(value, children, childrenAges);
    }
  };

  const handleChildrenChange = (newValue: number) => {
    const value = Math.max(0, Math.min(maxChildren, newValue));
    const totalGuests = adults + value;
    
    if (totalGuests > maxGuests) {
      return;
    }
    
    setChildren(value);
    
    // Обновляем массив возрастов
    if (value > childrenAges.length) {
      setChildrenAges([...childrenAges, ...Array(value - childrenAges.length).fill(0)]);
    } else {
      setChildrenAges(childrenAges.slice(0, value));
    }
    
    if (requireChildrenAges && value > 0) {
      setShowAges(true);
    } else if (value === 0) {
      setShowAges(false);
    }
    
    onChange(adults, value, childrenAges.slice(0, value));
  };

  const handleChildAgeChange = (index: number, age: number) => {
    const newAges = [...childrenAges];
    newAges[index] = age;
    setChildrenAges(newAges);
    onChange(adults, children, newAges);
  };

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Взрослые */}
      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
        <div>
          <div className="text-white font-medium">Взрослые</div>
          <div className="text-white/60 text-sm">от 13 лет</div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleAdultsChange(adults - 1)}
            disabled={adults <= 1}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              adults <= 1
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-premium-gold text-premium-black hover:bg-premium-gold/90'
            )}
            aria-label="Уменьшить количество взрослых"
          >
            −
          </button>
          <span className="w-8 text-center text-white font-bold">{adults}</span>
          <button
            onClick={() => handleAdultsChange(adults + 1)}
            disabled={adults >= maxGuests || (adults + children) >= maxGuests}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              (adults >= maxGuests || (adults + children) >= maxGuests)
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-premium-gold text-premium-black hover:bg-premium-gold/90'
            )}
            aria-label="Увеличить количество взрослых"
          >
            +
          </button>
        </div>
      </div>

      {/* Дети */}
      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
        <div>
          <div className="text-white font-medium">Дети</div>
          <div className="text-white/60 text-sm">от 0 до 12 лет</div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleChildrenChange(children - 1)}
            disabled={children <= 0}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              children <= 0
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-premium-gold text-premium-black hover:bg-premium-gold/90'
            )}
            aria-label="Уменьшить количество детей"
          >
            −
          </button>
          <span className="w-8 text-center text-white font-bold">{children}</span>
          <button
            onClick={() => handleChildrenChange(children + 1)}
            disabled={children >= maxChildren || (adults + children) >= maxGuests}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              (children >= maxChildren || (adults + children) >= maxGuests)
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-premium-gold text-premium-black hover:bg-premium-gold/90'
            )}
            aria-label="Увеличить количество детей"
          >
            +
          </button>
        </div>
      </div>

      {/* Возраст детей */}
      {showAges && children > 0 && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
          <div className="text-white font-medium mb-3">
            Укажите возраст детей на момент заезда
          </div>
          {Array.from({ length: children }).map((_, childIndex) => (
            <div key={`child-age-${childIndex}`} className="flex items-center justify-between">
              <span className="text-white/70">Ребёнок {childIndex + 1}</span>
              <select
                value={childrenAges[childIndex] || 0}
                onChange={(e) => handleChildAgeChange(childIndex, Number(e.target.value))}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-premium-gold"
                aria-label={`Возраст ребёнка ${index + 1}`}
              >
                <option value={0}>Выберите возраст</option>
                {Array.from({ length: 13 }).map((_, age) => (
                  <option key={age} value={age}>
                    {age === 0 ? 'До 1 года' : `${age} ${getAgeLabel(age)}`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Итого */}
      <div className="text-center text-white/70 text-sm">
        Всего гостей: {adults + children} из {maxGuests}
      </div>
    </div>
  );
};

// Утилита для склонения слова "год/года/лет"
const getAgeLabel = (age: number): string => {
  if (age === 1) return 'год';
  if (age >= 2 && age <= 4) return 'года';
  return 'лет';
};

export default GuestSelector;



