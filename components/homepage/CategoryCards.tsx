'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/homepage/Reveal';
import { useInterestTracker } from '@/hooks/useInterestTracker';

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
  { label: 'Озёра',      slug: 'lakes',                img: '/images/gallery/bay-sunset.jpg',    size: 'normal' },
  { label: 'Горы',       slug: 'mountains',            img: '/images/gallery/stela.jpg',         size: 'normal' },
  { label: 'Реки',       slug: 'rivers',               img: '/images/bento/khalaktyr.jpg',       size: 'normal' },
  { label: 'Эко-туры',   slug: 'eco',                  img: '/images/gallery/aurora.jpg',        size: 'wide'   },
];

/** col / row CSS Grid span per size  */
const SPAN: Record<CardSize, { col: string; row: string }> = {
  large:  { col: 'md:col-span-2', row: 'md:row-span-2' },
  tall:   { col: '',              row: 'md:row-span-2'  },
  wide:   { col: 'md:col-span-2', row: ''               },
  normal: { col: '',              row: ''               },
};


export function CategoryCards() {
  const { trackClick, trackHoverStart } = useInterestTracker();
  const hoverCleanups = useRef<Map<string, () => void>>(new Map());
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/public/stats/categories')
      .then(r => r.json())
      .then(j => { if (j.success) setCounts(j.data); })
      .catch(() => {/* silent */});
  }, []);

  return (
    <section id="categories" className="py-16 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--kh-text)] mb-2">
            Направления
          </h2>
          <p className="text-[var(--kh-text-dim)] text-sm mb-8">
            14 направлений активного отдыха на полуострове
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
                href={`/routes?category=${cat.slug}`}
                className={`kh-fade-up group relative overflow-hidden rounded-lg ${col} ${row}`}
                style={{ animationDelay: `${i * 60}ms` }}
                onMouseEnter={() => {
                  const cleanup = trackHoverStart(cat.slug);
                  hoverCleanups.current.set(cat.slug, cleanup);
                }}
                onMouseLeave={() => {
                  hoverCleanups.current.get(cat.slug)?.();
                  hoverCleanups.current.delete(cat.slug);
                }}
                onClick={() => trackClick(cat.slug)}
              >
                <Image
                  src={cat.img}
                  alt={cat.label}
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-black/70 transition-all duration-300" />

                {/* label + count */}
                <div className="absolute bottom-2 left-3 right-3">
                  <span className="text-white text-xs font-semibold tracking-wide drop-shadow-sm">
                    {cat.label}
                  </span>
                  {counts[cat.slug] != null && counts[cat.slug] > 0 && (
                    <span className="ml-1.5 text-white/60 text-[10px] drop-shadow-sm">
                      {counts[cat.slug]}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
