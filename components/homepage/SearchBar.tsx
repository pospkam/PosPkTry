'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

const QUICK_CATEGORIES = [
  { label: 'Вулканы', slug: 'vulkani' },
  { label: 'Рыбалка', slug: 'rybalka' },
  { label: 'Термы', slug: 'termalnye_istochniki' },
  { label: 'Море', slug: 'morskie_progulki' },
  { label: 'Вертолёты', slug: 'vertoletnye_tury' },
  { label: 'Снегоходы', slug: 'snegohod' },
] as const;

export function SearchBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/routes?q=${encodeURIComponent(q)}` : '/routes');
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-1.5 shadow-lg">
        <Search className="w-5 h-5 text-[var(--text-muted)] ml-3 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Куда на Камчатке?"
          className="flex-1 px-3 py-2.5 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
        />
        <button
          type="submit"
          className="px-6 py-2.5 bg-[var(--accent)] text-white text-sm font-semibold rounded-md hover:opacity-90 transition-opacity shrink-0"
        >
          Найти
        </button>
      </form>

      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
        {QUICK_CATEGORIES.map(cat => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => router.push(`/routes?category=${cat.slug}`)}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
