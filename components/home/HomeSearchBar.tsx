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
          className="absolute left-5 top-1/2 -translate-y-1/2 text-white pointer-events-none flex items-center"
        >
          <Search size={24} strokeWidth={2} />
        </div>

        {/* Поле ввода — frosted glass pill */}
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск направления"
          autoComplete="off"
          className="w-full pl-14 pr-14 py-4 rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/10 text-white placeholder-white shadow-lg shadow-black/5 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/30 transition-all"
        />

        {/* ChevronDown справа */}
        <button
          type="button"
          aria-label="Фильтры поиска"
          className="absolute right-5 top-1/2 -translate-y-1/2 text-white flex items-center"
          onClick={() => router.push('/search')}
        >
          <ChevronDown size={24} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
