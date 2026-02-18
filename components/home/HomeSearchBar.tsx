'use client';

import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * HomeSearchBar — строка поиска на главном экране (iOS light theme).
 * Белый pill с frosted glass, иконка поиска слева, ChevronDown справа.
 */

interface HomeSearchBarProps {
  onSearch?: (query: string) => void;
}

export function HomeSearchBar({ onSearch }: HomeSearchBarProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      onSearch?.(q);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Поиск туров">
      <div className="relative">
        {/* Иконка поиска слева */}
        <div
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center"
        >
          <Search size={18} strokeWidth={2} />
        </div>

        {/* Поле ввода */}
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск туров, маршрутов..."
          autoComplete="off"
          className="w-full pl-11 pr-11 py-3.5 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/20 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4A7FD4]/30 transition-all"
        />

        {/* ChevronDown справа */}
        <button
          type="button"
          aria-label="Фильтры поиска"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 flex items-center"
          onClick={() => router.push('/search')}
        >
          <ChevronDown size={18} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
