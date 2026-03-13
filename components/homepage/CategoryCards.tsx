'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/homepage/Reveal';

const CATEGORIES = [
  { label: 'Вулканы', slug: 'vulkani', img: '/images/activities/volcanoes.jpg' },
  { label: 'Гейзеры', slug: 'geyzery', img: '/images/activities/volcanoes.jpg' },
  { label: 'Рыбалка', slug: 'rybalka', img: '/images/activities/fishing.jpg' },
  { label: 'Термальные', slug: 'termalnye_istochniki', img: '/images/activities/hotsprings.jpg' },
  { label: 'Медведи', slug: 'medvedi', img: '/images/gallery/road-winter.jpg' },
  { label: 'Морские', slug: 'morskie_progulki', img: '/images/activities/sea.jpg' },
  { label: 'Вертолёты', slug: 'vertoletnye_tury', img: '/images/activities/helicopter.jpg' },
  { label: 'Треккинг', slug: 'trekking', img: '/images/gallery/camp-sunset.jpg' },
  { label: 'Снегоходы', slug: 'snegohod', img: '/images/activities/snowmobile.jpg' },
  { label: 'Джипы', slug: 'dzhip', img: '/images/activities/jeep.jpg' },
  { label: 'Озёра', slug: 'ozera', img: '/images/gallery/bay-sunset.jpg' },
  { label: 'Горы', slug: 'gory', img: '/images/gallery/stela.jpg' },
  { label: 'Реки', slug: 'reki', img: '/images/bento/khalaktyr.jpg' },
  { label: 'Эко-туры', slug: 'eko', img: '/images/gallery/aurora.jpg' },
  { label: 'Комбо', slug: 'kombo', img: '/images/activities/volcanoes.jpg' },
] as const;

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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat.slug} delay={Math.min(i + 1, 4) as 1 | 2 | 3 | 4}>
              <Link
                href={`/tours?category=${cat.slug}`}
                className="group relative overflow-hidden rounded-lg aspect-[4/3] block"
              >
                <Image
                  src={cat.img}
                  alt={cat.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3 md:p-4">
                  <h3 className="font-playfair text-base md:text-lg font-bold text-white">
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
