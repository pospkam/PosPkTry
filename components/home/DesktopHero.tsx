'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DesktopHero() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <section
      aria-label="Kamchatka"
      className="hidden lg:block relative w-full min-h-[520px] xl:min-h-[600px] overflow-hidden bg-[#0D1117] hero-stars"
    >
      <div className="max-w-7xl mx-auto px-12 xl:px-16 py-20 flex items-center gap-12">
        {/* Levaya chast' -- tekst i poisk */}
        <div className="flex-1 max-w-xl">
          <h1 className="font-serif text-5xl xl:text-6xl font-bold text-[#F0F6FC] leading-tight mb-6">
            Камчатка --
            <br />
            <span className="text-[var(--accent)]">там где земля</span>
            <br />
            ещё живая
          </h1>
          <p className="text-lg text-[#8B949E] mb-10 leading-relaxed max-w-md">
            Вулканы, дикая рыбалка, термальные источники и медведи.
            Забронируйте тур мечты.
          </p>

          <form onSubmit={handleSearch} className="relative max-w-lg mb-6" aria-label="Поиск направления">
            <Search
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58] pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Куда хотите поехать?"
              className="w-full pl-14 pr-36 py-5 rounded-2xl bg-[#21262D] border border-[rgba(255,255,255,0.08)] text-[#F0F6FC] placeholder-[#484F58] text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]/50"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors text-sm min-h-[44px]"
            >
              Найти тур
            </button>
          </form>

          <div className="flex items-center gap-3">
            <span className="text-[#484F58] text-sm">Популярное:</span>
            {['Вулканы', 'Рыбалка', 'Медведи', 'Термы'].map(tag => (
              <Link
                key={tag}
                href={`/tours?category=${tag.toLowerCase()}`}
                className="px-3 py-1.5 rounded-full border border-[var(--accent)]/30 text-[var(--accent)] text-sm hover:bg-[var(--accent)]/10 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Pravaya chast' -- kartochki s foto (desktop) */}
        <div className="hidden xl:grid grid-cols-2 gap-4 w-[400px]">
          {[
            { src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80', label: 'Вулканы' },
            { src: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400&q=80', label: 'Медведи' },
            { src: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', label: 'Термы' },
          ].map((card, i) => (
            <Link
              key={card.label}
              href={`/tours?category=${card.label.toLowerCase()}`}
              className={`relative rounded-2xl overflow-hidden bg-[#21262D] hover:scale-[1.02] transition-transform ${i === 0 ? 'col-span-2 h-48' : 'h-36'}`}
            >
              <img src={card.src} alt={card.label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/80 to-transparent" />
              <span className="absolute bottom-3 left-4 text-white font-semibold text-sm">{card.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
