'use client';

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';

export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchBar({
  placeholder = 'Поиск...',
  onSearch,
  debounceMs = 300,
  className
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout for debounced search
    const newTimeoutId = setTimeout(() => {
      onSearch(newValue);
    }, debounceMs);

    setTimeoutId(newTimeoutId);
  }, [onSearch, debounceMs, timeoutId]);

  const handleClear = () => {
    setValue('');
    onSearch('');
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return (
    <div className={clsx('relative', className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-white/50 text-lg">🔍</span>
        </div>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={clsx(
            'w-full pl-12 pr-12 py-3 rounded-xl',
            'bg-white/5 border border-white/10',
            'text-white placeholder-white/50',
            'focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent',
            'transition-all duration-200'
          )}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

