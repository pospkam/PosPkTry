'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/homepage/Reveal';

type CardSize = 'large' | 'tall' | 'wide' | 'normal';

const CATEGORIES: { label: string; slug: string; img: string; size: CardSize }[] = [
  { label: 'Вулканы',    slug: 'vulkani',             img: '/images/activities/volcanoes.jpg',  size: 'large'  },
  { label: 'Гейзеры',    slug: 'geyzery',             img: '/images/bento/mutnovsky.jpg',       size: 'normal' },
  { label: 'Рыбалка',    slug: 'rybalka',             img: '/images/activities/fishing.jpg',    size: 'tall'   },
  { label: 'Термальные', slug: 'termalnye_istochniki', img: '/images/activities/hotsprings.jpg', size: 'normal' },
  { label: 'Медведи',    slug: 'medvedi',             img: '/images/gallery/road-winter.jpg',   size: 'wide'   },
  { label: 'Морские',    slug: 'morskie_progulki',     img: '/images/activities/sea.jpg',        size: 'normal' },
  { label: 'Вертолёты',  slug: 'vertoletnye_tury',     img: '/images/activities/helicopter.jpg', size: 'normal' },
  { label: 'Треккинг',   slug: 'trekking',             img: '/images/gallery/camp-sunset.jpg',   size: 'normal' },
  { label: 'Снегоходы',  slug: 'snegohod',             img: '/images/activities/snowmobile.jpg', size: 'tall'   },
  { label: 'Джипы',      slug: 'dzhip',                img: '/images/activities/jeep.jpg',       size: 'wide'   },
  { label: 'Озёра',      slug: 'ozera',                img: '/images/gallery/bay-sunset.jpg',    size: 'normal' },
  { label: 'Горы',       slug: 'gory',                 img: '/images/gallery/stela.jpg',         size: 'normal' },
  { label: 'Реки',       slug: 'reki',                 img: '/images/bento/khalaktyr.jpg',       size: 'normal' },
  { label: 'Эко-туры',   slug: 'eko',                  img: '/images/gallery/aurora.jpg',        size: 'wide'   },
  { label: 'Комбо',      slug: 'kombo',                img: '/images/gallery/sunset-clouds.jpg', size: 'normal' },
];

/** col / row CSS Grid span per size  */
const SPAN: Record<CardSize, { col: string; row: string }> = {
  large:  { col: 'md:col-span-2', row: 'md:row-span-2' },
  tall:   { col: '',              row: 'md:row-span-2'  },
  wide:   { col: 'md:col-span-2', row: ''               },
  normal: { col: '',              row: ''               },
};

const FONT: Record<CardSize, string> = {
  large:  'text-xl md:text-3xl',
  wide:   'text-base md:text-xl',
  tall:   'text-sm md:text-lg',
  normal: 'text-xs md:text-sm',
};

const PAD: Record<CardSize, string> = {
  large:  'p-4 md:p-6',
  wide:   'p-3 md:p-5',
  tall:   'p-3 md:p-4',
  normal: 'p-2 md:p-3',
};

export function CategoryCards() {
  return (
    <section className="py-16 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--kh-text)] mb-2">
            Направления
          </h2>
          <p className="text-[var(--kh-text-dim)] text-sm mb-8">
            15 направлений активного отдыха на полуострове
          </p>
        </Reveal>

        {/* Moodboard grid — dense auto-flow fills gaps organically */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
          style={{ gridAutoRows: '140px', gridAutoFlow: 'dense' }}
        >
          {CATEGORIES.map((cat, i) => {
            const { col, row } = SPAN[cat.size];
            return (
              <Link
                key={cat.slug}
                href={`/tours?category=${cat.slug}`}
                className={`kh-fade-up group relative overflow-hidden rounded-lg ${col} ${row}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Image
                  src={cat.img}
                  alt=""
                  fill
                  sizes={
                    cat.size === 'large'
                      ? '(max-width: 768px) 50vw, 33vw'
                      : cat.size === 'wide'
                        ? '(max-width: 768px) 100vw, 50vw'
                        : '(max-width: 768px) 50vw, 25vw'
                  }
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  loading={i < 4 ? 'eager' : 'lazy'}
                />

                {/* overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent group-hover:from-black/85 transition-all duration-300" />

                {/* label */}
                <span className={`absolute bottom-0 left-0 right-0 font-playfair font-bold text-white leading-tight ${FONT[cat.size]} ${PAD[cat.size]}`}>
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
