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
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 dark:text-gray-400 pointer-events-none flex items-center"
        >
          <Search size={18} strokeWidth={2} />
        </div>

        {/* Поле ввода — frosted glass pill */}
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск направления..."
          autoComplete="off"
          className="w-full pl-11 pr-11 py-3.5 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/20 text-white dark:text-white placeholder-white/50 dark:placeholder-gray-500 shadow-lg shadow-black/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/25 dark:focus:bg-white/15 transition-all"
        />

        {/* ChevronDown справа */}
        <button
          type="button"
          aria-label="Фильтры поиска"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 dark:text-gray-500 flex items-center"
          onClick={() => router.push('/search')}
        >
          <ChevronDown size={18} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
