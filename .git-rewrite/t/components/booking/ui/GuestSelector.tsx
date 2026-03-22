'use client';

/**
 * GuestSelector — компонент выбора количества гостей для Kamchatour Hub
 * @param {GuestSelectorProps} props
 * @returns {JSX.Element}
 * @remarks
 * - Accessibility: role для контейнера, aria-label для секций и итогов, aria-live для динамического текста
 */

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
    <div className={clsx('space-y-4', className)} role="group" aria-label="Выбор количества гостей">
      {/* Взрослые */}
      <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg" aria-label="Взрослые">
        <div>
          <div className="text-[var(--text-primary)] font-medium">Взрослые</div>
          <div className="text-[var(--text-muted)] text-sm">от 13 лет</div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleAdultsChange(adults - 1)}
            disabled={adults <= 1}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              adults <= 1
                ? 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent)]/90'
            )}
            aria-label="Уменьшить количество взрослых"
          >
            −
          </button>
          <span className="w-8 text-center text-[var(--text-primary)] font-bold">{adults}</span>
          <button
            onClick={() => handleAdultsChange(adults + 1)}
            disabled={adults >= maxGuests || (adults + children) >= maxGuests}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              (adults >= maxGuests || (adults + children) >= maxGuests)
                ? 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent)]/90'
            )}
            aria-label="Увеличить количество взрослых"
          >
            +
          </button>
        </div>
      </div>

      {/* Дети */}
      <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg" aria-label="Дети">
        <div>
          <div className="text-[var(--text-primary)] font-medium">Дети</div>
          <div className="text-[var(--text-muted)] text-sm">от 0 до 12 лет</div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleChildrenChange(children - 1)}
            disabled={children <= 0}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              children <= 0
                ? 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent)]/90'
            )}
            aria-label="Уменьшить количество детей"
          >
            −
          </button>
          <span className="w-8 text-center text-[var(--text-primary)] font-bold">{children}</span>
          <button
            onClick={() => handleChildrenChange(children + 1)}
            disabled={children >= maxChildren || (adults + children) >= maxGuests}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              (children >= maxChildren || (adults + children) >= maxGuests)
                ? 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent)]/90'
            )}
            aria-label="Увеличить количество детей"
          >
            +
          </button>
        </div>
      </div>

      {/* Возраст детей */}
      {showAges && children > 0 && (
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg space-y-3" aria-label="Возраст детей">
          <div className="text-[var(--text-primary)] font-medium mb-3">
            Укажите возраст детей на момент заезда
          </div>
          {Array.from({ length: children }).map((_, childIndex) => (
            <div key={`child-age-${childIndex}`} className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Ребёнок {childIndex + 1}</span>
              <select
                value={childrenAges[childIndex] || 0}
                onChange={(e) => handleChildAgeChange(childIndex, Number(e.target.value))}
                className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                aria-label={`Возраст ребёнка ${childIndex + 1}`}
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
      <div className="text-center text-[var(--text-secondary)] text-sm" aria-label="Итого гостей" aria-live="polite">
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

// GuestSelector — используй именованный импорт: { GuestSelector }



