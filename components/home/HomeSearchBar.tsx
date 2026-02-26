'use client';

import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
        <div
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none flex items-center"
        >
          <Search size={18} strokeWidth={2} />
        </div>

        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск направления..."
          autoComplete="off"
          className="w-full pl-11 pr-11 py-3.5 rounded-full bg-white/10 border border-white/10 text-white placeholder-white/40 shadow-lg shadow-black/20 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]/50 transition-all"
        />

        <button
          type="button"
          aria-label="Фильтры поиска"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 flex items-center"
          onClick={() => router.push('/search')}
        >
          <ChevronDown size={18} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
