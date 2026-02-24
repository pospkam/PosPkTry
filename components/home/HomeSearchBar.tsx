'use client';

import { useState } from 'react';
import { Search, Calendar, Users, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * HomeSearchBar — комплексный поиск туров (iOS light theme).
 * Многоуровневый блок с frosted glass: Направление, Даты, Туристы.
 */

interface HomeSearchBarProps {
  onSearch?: (query: string) => void;
}

export function HomeSearchBar({ onSearch }: HomeSearchBarProps) {
  const [query, setQuery] = useState('');
  const [guests, setGuests] = useState(1);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) {
      onSearch?.(query.trim());
      params.append('q', query.trim());
    }
    if (guests > 1) params.append('guests', guests.toString());
    
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Комплексный поиск туров" className="w-full">
      <div className="bg-white/20 backdrop-blur-xl border border-white/20 rounded-[32px] p-2 shadow-lg shadow-black/10 flex flex-col gap-1.5">
        
        {/* 1. Направление / Поиск */}
        <div className="flex items-center px-5 py-4 bg-white/10 rounded-[24px] border border-white/5">
          <MapPin size={22} className="text-white mr-3 flex-shrink-0" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Куда хотите отправиться?"
            autoComplete="off"
            className="bg-transparent text-white placeholder-white/80 w-full focus:outline-none text-lg font-medium"
          />
        </div>

        {/* 2. Даты и Гости (в один ряд) */}
        <div className="flex gap-1.5">
          {/* Даты */}
          <button 
            type="button"
            className="flex-1 flex items-center px-4 py-3.5 bg-white/10 rounded-[24px] border border-white/5 text-white hover:bg-white/20 transition-colors"
            onClick={() => {/* TODO: Open Date Picker */}}
          >
            <Calendar size={20} className="mr-3 flex-shrink-0 text-white/90" />
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider leading-none mb-1">Даты</span>
              <span className="text-sm font-semibold leading-none">Любые</span>
            </div>
          </button>

          {/* Гости */}
          <button 
            type="button"
            className="flex-1 flex items-center px-4 py-3.5 bg-white/10 rounded-[24px] border border-white/5 text-white hover:bg-white/20 transition-colors"
            onClick={() => setGuests(prev => prev < 10 ? prev + 1 : 1)}
          >
            <Users size={20} className="mr-3 flex-shrink-0 text-white/90" />
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider leading-none mb-1">Туристы</span>
              <span className="text-sm font-semibold leading-none">{guests} чел.</span>
            </div>
          </button>
        </div>

        {/* 3. Кнопка поиска */}
        <button
          type="submit"
          className="w-full mt-1 bg-white text-black font-bold text-lg py-4 rounded-[24px] flex items-center justify-center gap-2 hover:bg-white/90 transition-colors shadow-sm"
        >
          <Search size={22} strokeWidth={2.5} />
          Найти туры
        </button>

      </div>
    </form>
  );
}
