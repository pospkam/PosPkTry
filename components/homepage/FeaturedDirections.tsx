'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

const DIRECTIONS = [
  {
    title: 'Вулканы',
    desc: 'Восхождения и облёты',
    slug: 'volcano',
    image: '/images/categories/vulkany.jpg',
  },
  {
    title: 'Медведи',
    desc: 'Наблюдение в дикой природе',
    slug: 'bears',
    image: '/images/categories/medvedi.jpg',
  },
  {
    title: 'Рыбалка',
    desc: 'Чавыча, нерка, кижуч',
    slug: 'fishing',
    image: '/images/categories/rybalka.jpg',
  },
  {
    title: 'Термальные',
    desc: 'Горячие источники',
    slug: 'thermal',
    image: '/images/categories/termy.jpg',
  },
  {
    title: 'Океан',
    desc: 'Морские прогулки и сёрфинг',
    slug: 'sea',
    image: '/images/categories/morskie.jpg',
  },
  {
    title: 'Вертолёты',
    desc: 'Долина гейзеров и кальдера',
    slug: 'helicopter',
    image: '/images/categories/vertolety.jpg',
  },
];

export function FeaturedDirections() {
  return (
    <section className="py-20 md:py-28 px-5 bg-[var(--bg-card)]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
              Направления
            </h2>
            <p className="text-[var(--text-secondary)] text-sm md:text-base">
              Камчатка в шести гранях
            </p>
          </div>
          <Link
            href="/routes"
            className="hidden md:inline-flex items-center gap-1.5 text-sm text-[var(--accent)] font-medium hover:opacity-80 transition-opacity"
          >
            Все направления
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIRECTIONS.map((dir, i) => (
            <Reveal key={dir.slug} delay={i}>
              <Link
                href={`/routes?category=${dir.slug}`}
                className="group relative block aspect-[4/3] rounded-lg overflow-hidden"
              >
                <Image
                  src={dir.image}
                  alt={dir.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-playfair text-xl font-bold text-white mb-0.5">
                    {dir.title}
                  </h3>
                  <p className="text-sm text-[rgba(255,255,255,0.7)]">{dir.desc}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* Mobile link */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/routes"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] font-medium"
          >
            Все направления
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
