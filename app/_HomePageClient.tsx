'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from 'react-responsive';
import {
  Search, Mountain, Fish, Waves, Footprints, Wind, Sailboat, Zap,
  Shield, Leaf, Star, ChevronRight, Bot,
} from 'lucide-react';
import { TourCardsRow } from '@/components/home';
import { ModernTourSearch } from '@/components/ModernTourSearch';

// Kamchatskiye foto dlya hero i sekcij
const HERO_IMAGE = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85';

const CATEGORIES = [
  { id: 'volcanoes', label: 'Вулканы', Icon: Mountain, href: '/tours?category=volcanoes' },
  { id: 'bears', label: 'Медведи', Icon: Zap, href: '/tours?category=bears' },
  { id: 'fishing', label: 'Рыбалка', Icon: Fish, href: '/tours?category=fishing' },
  { id: 'thermal', label: 'Термы', Icon: Waves, href: '/tours?category=thermal' },
  { id: 'hiking', label: 'Треккинг', Icon: Footprints, href: '/tours?category=hiking' },
  { id: 'helicopter', label: 'Вертолёт', Icon: Wind, href: '/tours?category=helicopter' },
  { id: 'rafting', label: 'Рафтинг', Icon: Sailboat, href: '/tours?category=rafting' },
] as const;

const WHY_KAMCHATKA = [
  { Icon: Shield, title: 'Безопасность', text: 'Сертифицированные гиды, регистрация в МЧС, SOS-кнопка в каждом туре' },
  { Icon: Leaf, title: 'Экология', text: 'Эко-баллы за ответственный туризм. 100 баллов = посаженное дерево' },
  { Icon: Star, title: 'Качество', text: 'Проверенные операторы, реальные отзывы, гарантия лучшей цены' },
] as const;

export default function HomePageClient() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <div className="min-h-screen bg-[#0D1117]">

      {/* ======== HERO ======== */}
      <section
        className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-[#0D1117]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117]/70 to-transparent" />

        {/* Kontent poverh foto */}
        <div className="absolute inset-0 flex flex-col justify-end pb-16 lg:pb-24 px-4 lg:px-16">
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-[1.1] mb-4 drop-shadow-lg">
              Камчатка
              <span className="block text-[var(--accent)]">там где земля ещё живая</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-lg leading-relaxed drop-shadow">
              Вулканы, дикая рыбалка, термальные источники и медведи. Забронируйте тур мечты.
            </p>

            {/* Poisk */}
            <form onSubmit={handleSearch} className="relative max-w-xl mb-6">
              <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Куда хотите поехать?"
                className="w-full pl-14 pr-36 py-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-white/40 text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 shadow-2xl"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors text-sm min-h-[44px]"
              >
                Найти тур
              </button>
            </form>

            {/* Tegi */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white/40 text-sm">Популярное:</span>
              {['Вулканы', 'Рыбалка', 'Медведи', 'Термы'].map(tag => (
                <Link
                  key={tag}
                  href={`/tours?category=${tag.toLowerCase()}`}
                  className="px-3 py-1.5 rounded-full border border-[var(--accent)]/30 text-[var(--accent)] text-sm hover:bg-[var(--accent)]/10 transition-colors backdrop-blur-sm"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======== KATEGORII ======== */}
      <section className="bg-[#161B22] py-16 px-4 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-8">
            Выберите приключение
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.id}
                href={cat.href}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#21262D] border border-[rgba(255,255,255,0.08)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-all min-h-[44px]"
              >
                <cat.Icon className="w-6 h-6 text-[var(--accent)]" />
                <span className="text-xs text-[#8B949E] text-center">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ======== POISK I TURY ======== */}
      <section className="bg-[#0D1117] py-16 px-4 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div className="text-[#484F58]">Загрузка...</div>}>
            <ModernTourSearch />
          </Suspense>

          <div className="mt-12">
            <TourCardsRow />
          </div>
        </div>
      </section>

      {/* ======== POCHEMU KAMCHATKA ======== */}
      <section className="bg-[#161B22] py-16 px-4 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-8">
            Почему Камчатка
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY_KAMCHATKA.map(item => (
              <div
                key={item.title}
                className="bg-[#21262D] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 hover:border-[var(--accent)]/30 transition-colors"
              >
                <item.Icon className="w-8 h-8 text-[var(--accent)] mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-[#8B949E] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== AI CTA ======== */}
      <section className="bg-[#0D1117] py-12 px-4 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-6">
            <Bot className="w-12 h-12 text-[var(--accent)] shrink-0" />
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-serif text-xl md:text-2xl font-bold text-white mb-2">
                Не знаете с чего начать?
              </h2>
              <p className="text-[#8B949E] mb-4">
                AI-помощник подберёт идеальный тур за 30 секунд. Просто расскажите что вам нравится.
              </p>
              <Link
                href="/ai-assistant"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors min-h-[44px]"
              >
                Спросить AI
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
