'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * DesktopHero -- широкий hero-баннер для десктопной версии (>= 1024px).
 * Тёмный вулканический градиент + звёздное поле через CSS pseudo-element.
 */

export function DesktopHero() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <section
      aria-label="Камчатка -- откройте дикую природу"
      className="hidden lg:block relative w-full h-[420px] xl:h-[480px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D1117] via-[#1a0a00] to-[#0D1117] hero-stars"
    >
      {/* Контент поверх */}
      <div className="absolute inset-0 flex flex-col justify-center px-12 xl:px-16 max-w-2xl z-10">
        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4 drop-shadow-lg">
          Откройте
          <br />
          <span className="text-[var(--accent)]">Камчатку</span>
        </h1>
        <p className="text-lg text-white/80 mb-8 max-w-md leading-relaxed">
          Вулканы, дикая рыбалка, термальные источники и медведи. Забронируйте тур мечты.
        </p>

        {/* Поисковая строка */}
        <form onSubmit={handleSearch} className="relative max-w-lg" aria-label="Поиск направления">
          <Search
            size={20}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Куда хотите поехать?"
            className="w-full pr-36 py-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-xl text-white placeholder-white/40 text-base focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]/50 shadow-xl"
            style={{ paddingLeft: '3.25rem' }}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors text-sm min-h-[44px]"
          >
            Найти тур
          </button>
        </form>

        {/* Быстрые ссылки */}
        <div className="flex items-center gap-3 mt-6">
          <span className="text-white/50 text-sm">Популярное:</span>
          {['Вулканы', 'Рыбалка', 'Медведи', 'Термы'].map(tag => (
            <Link
              key={tag}
              href={`/tours?category=${tag.toLowerCase()}`}
              className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 text-sm hover:bg-white/25 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
