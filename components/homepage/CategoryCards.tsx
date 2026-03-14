'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/homepage/Reveal';

type CardSize = 'large' | 'tall' | 'wide' | 'normal';

const CATEGORIES: { label: string; slug: string; img: string; size: CardSize }[] = [
  { label: 'Вулканы',      slug: 'vulkani',              img: '/images/activities/volcanoes.jpg',  size: 'large' },
  { label: 'Гейзеры',      slug: 'geyzery',              img: '/images/bento/mutnovsky.jpg',       size: 'normal' },
  { label: 'Рыбалка',      slug: 'rybalka',              img: '/images/activities/fishing.jpg',    size: 'tall' },
  { label: 'Термальные',   slug: 'termalnye_istochniki',  img: '/images/activities/hotsprings.jpg', size: 'normal' },
  { label: 'Медведи',      slug: 'medvedi',              img: '/images/gallery/road-winter.jpg',   size: 'wide' },
  { label: 'Морские',      slug: 'morskie_progulki',      img: '/images/activities/sea.jpg',        size: 'normal' },
  { label: 'Вертолёты',    slug: 'vertoletnye_tury',      img: '/images/activities/helicopter.jpg', size: 'normal' },
  { label: 'Треккинг',     slug: 'trekking',              img: '/images/gallery/camp-sunset.jpg',   size: 'normal' },
  { label: 'Снегоходы',    slug: 'snegohod',              img: '/images/activities/snowmobile.jpg', size: 'tall' },
  { label: 'Джипы',        slug: 'dzhip',                 img: '/images/activities/jeep.jpg',       size: 'wide' },
  { label: 'Озёра',        slug: 'ozera',                 img: '/images/gallery/bay-sunset.jpg',    size: 'normal' },
  { label: 'Горы',         slug: 'gory',                  img: '/images/gallery/stela.jpg',         size: 'normal' },
  { label: 'Реки',         slug: 'reki',                  img: '/images/bento/khalaktyr.jpg',       size: 'normal' },
  { label: 'Эко-туры',     slug: 'eko',                   img: '/images/gallery/aurora.jpg',        size: 'wide' },
  { label: 'Комбо',        slug: 'kombo',                 img: '/images/gallery/sunset-clouds.jpg', size: 'normal' },
];

const GRID_CLASSES: Record<CardSize, string> = {
  large:  'col-span-2 row-span-2',
  tall:   'row-span-2',
  wide:   'col-span-2',
  normal: '',
};

const TEXT_CLASSES: Record<CardSize, string> = {
  large:  'text-xl md:text-3xl',
  tall:   'text-base md:text-lg',
  wide:   'text-base md:text-xl',
  normal: 'text-sm md:text-base',
};

export function CategoryCards() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--kh-text)] mb-2">
            Направления
          </h2>
          <p className="text-[var(--kh-text-dim)] text-sm mb-8">
            15 направлений активного отдыха на полуострове
          </p>
        </Reveal>

        <div
          className="grid grid-cols-2 md:grid-cols-4 auto-rows-[120px] md:auto-rows-[160px] gap-2 md:gap-3"
          style={{ gridAutoFlow: 'dense' }}
        >
          {CATEGORIES.map((cat, i) => (
            <Reveal
              key={cat.slug}
              delay={Math.min(i + 1, 4) as 1 | 2 | 3 | 4}
              className={`${GRID_CLASSES[cat.size]} h-full`}
            >
              <Link
                href={`/tours?category=${cat.slug}`}
                className="group relative overflow-hidden rounded-lg block h-full"
              >
                <Image
                  src={cat.img}
                  alt={cat.label}
                  fill
                  sizes={cat.size === 'large' ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  loading="lazy"
                />

                <div className={`absolute inset-0 transition-opacity duration-300 ${
                  cat.size === 'large'
                    ? 'bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:opacity-90'
                    : 'bg-gradient-to-t from-black/70 via-black/10 to-transparent group-hover:opacity-80'
                }`} />

                <div className={`absolute bottom-0 left-0 ${cat.size === 'large' ? 'p-4 md:p-6' : 'p-3 md:p-4'}`}>
                  <h3 className={`font-playfair font-bold text-white leading-tight ${TEXT_CLASSES[cat.size]}`}>
                    {cat.label}
                  </h3>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
