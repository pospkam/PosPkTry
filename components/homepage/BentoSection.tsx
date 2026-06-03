'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

const CATEGORIES = [
  {
    title: 'Вулканы',
    subtitle: 'Живая мощь земли',
    image: '/images/bento/mutnovsky.jpg',
    href: '/routes?location_type=volcano',
    tag: '01 / Элемент'
  },
  {
    title: 'Океан',
    subtitle: 'Черные пляжи и серфинг',
    image: '/images/bento/khalaktyr.jpg',
    href: '/routes?location_type=beach',
    tag: '02 / Стихия'
  },
  {
    title: 'Медведи',
    subtitle: 'Хозяева тайги',
    image: '/images/bento/cape.jpg',
    href: '/routes?kind=place',
    tag: '03 / Жизнь'
  },
  {
    title: 'Зима',
    subtitle: 'Хели-ски и ледники',
    image: '/images/bento/paratunka.jpg',
    href: '/routes?location_type=hot_spring',
    tag: '04 / Сезон'
  },
];

export function BentoSection() {
  return (
    <section className="py-24 bg-[var(--bg-primary)]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="font-playfair text-5xl md:text-7xl font-bold mb-6 leading-tight text-[var(--text-primary)]">
              Стихии <br /> <span className="text-[var(--accent)] italic">Камчатки</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-lg md:text-xl leading-relaxed font-light">
              Мы разделили полуостров на ключевые элементы, чтобы вы могли найти свое идеальное приключение — от жара кратеров до ледяного спокойствия бухт.
            </p>
          </div>
          <Link href="/routes" className="text-xs font-bold uppercase tracking-[0.3em] border-b border-[var(--accent)] pb-2 text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
            Все маршруты
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[800px]">
          {/* Large Card */}
          <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
            <Image 
              src={CATEGORIES[0].image} 
              alt={CATEGORIES[0].title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-60" 
            />
            <div className="relative z-20 p-10 h-full flex flex-col justify-end">
              <span className="text-[var(--accent)] font-bold tracking-[0.4em] uppercase text-[10px] mb-4">{CATEGORIES[0].tag}</span>
              <h3 className="font-playfair text-5xl md:text-6xl text-[var(--text-primary)] font-bold mb-6 leading-none">{CATEGORIES[0].title}</h3>
              <p className="text-[var(--text-secondary)] max-w-xs mb-8 text-lg font-light">{CATEGORIES[0].subtitle}</p>
              <Link href={CATEGORIES[0].href} className="w-14 h-14 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-[var(--bg-card)] transition-all">
                <ArrowUpRight size={28} />
              </Link>
            </div>
          </div>

          {/* Small Cards */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {CATEGORIES.slice(1, 3).map((cat) => (
              <div key={cat.title} className="relative group overflow-hidden rounded-lg min-h-[350px] bg-[var(--bg-card)] border border-[var(--border)]">
                <Image 
                  src={cat.image} 
                  alt={cat.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-50" 
                />
                <div className="relative z-20 p-8 h-full flex flex-col justify-end">
                  <span className="text-[var(--accent)] font-bold tracking-[0.3em] uppercase text-[9px] mb-3">{cat.tag}</span>
                  <h3 className="font-playfair text-3xl text-[var(--text-primary)] font-bold mb-3">{cat.title}</h3>
                  <p className="text-[var(--text-muted)] text-sm mb-6 font-light">{cat.subtitle}</p>
                  <Link href={cat.href} className="text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:text-[var(--accent)] transition-colors">
                    Исследовать <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Medium Card */}
          <div className="md:col-span-2 relative group overflow-hidden rounded-lg min-h-[350px] bg-[var(--bg-card)] border border-[var(--border)]">
            <Image 
              src={CATEGORIES[3].image} 
              alt={CATEGORIES[3].title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-60" 
            />
            <div className="relative z-20 p-10 h-full flex flex-col justify-end">
              <span className="text-[var(--accent)] font-bold tracking-[0.3em] uppercase text-[9px] mb-3">{CATEGORIES[3].tag}</span>
              <h3 className="font-playfair text-4xl text-[var(--text-primary)] font-bold mb-4">{CATEGORIES[3].title}</h3>
              <p className="text-[var(--text-secondary)] max-w-sm mb-6 font-light">{CATEGORIES[3].subtitle}</p>
              <Link href={CATEGORIES[3].href} className="text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:text-[var(--accent)] transition-colors">
                Смотреть сезонные туры <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
