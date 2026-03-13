'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/homepage/Reveal';

interface Tour {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  duration: number;
  price: number;
  rating: number;
  reviewCount: number;
  images: string[];
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный',
};

const CATEGORY_LABELS: Record<string, string> = {
  vulkani: 'Вулканы',
  rybalka: 'Рыбалка',
  termalnye_istochniki: 'Термальные',
  morskie_progulki: 'Морские',
  vertoletnye_tury: 'Вертолёты',
  snegohod: 'Снегоходы',
  trekking: 'Треккинг',
  medvedi: 'Медведи',
  lakes: 'Озёра',
  rivers: 'Реки',
  mountains: 'Горы',
  eco: 'Эко',
};

export function FeaturedTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tours?limit=4')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.tours) {
          setTours(data.data.tours);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--kh-text)] mb-2">
            Популярные туры
          </h2>
          <p className="text-[var(--kh-text-dim)] text-sm mb-8">
            Реальные предложения от проверенных операторов
          </p>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[var(--kh-surface)] border border-[var(--kh-border)] rounded-lg overflow-hidden">
                <div className="ds-skeleton aspect-[4/3]" />
                <div className="p-4 space-y-2">
                  <div className="ds-skeleton h-3 w-1/3 rounded" />
                  <div className="ds-skeleton h-5 w-2/3 rounded" />
                  <div className="ds-skeleton h-3 w-1/2 rounded" />
                  <div className="ds-skeleton h-6 w-1/3 rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-12 text-[var(--kh-text-dim)]">
            <p className="text-sm">Скоро появятся первые туры</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tours.map(tour => (
              <Reveal key={tour.id}>
                <Link
                  href={`/tours/${tour.id}`}
                  className="group bg-[var(--kh-surface)] border border-[var(--kh-border)] rounded-lg overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={tour.images[0] || '/images/activities/volcanoes.jpg'}
                      alt={tour.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {tour.difficulty && (
                      <span className="absolute top-3 left-3 px-2 py-1 text-[10px] font-semibold uppercase rounded bg-[var(--kh-accent)] text-white">
                        {DIFFICULTY_LABELS[tour.difficulty] || tour.difficulty}
                      </span>
                    )}
                    {tour.rating > 0 && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 text-[var(--kh-accent)] fill-[var(--kh-accent)]" />
                        <span className="text-white text-xs font-bold">{tour.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--kh-text-dim)] mb-1">
                      {CATEGORY_LABELS[tour.category] || tour.category}
                    </p>
                    <h3 className="font-playfair text-base font-bold text-[var(--kh-text)] group-hover:text-[var(--kh-accent)] transition-colors line-clamp-2">
                      {tour.name}
                    </h3>
                    {tour.duration > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-[var(--kh-text-dim)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{tour.duration} {tour.duration === 1 ? 'день' : tour.duration < 5 ? 'дня' : 'дней'}</span>
                      </div>
                    )}
                    <div className="mt-auto pt-3">
                      <span className="text-lg font-bold text-[var(--kh-accent)]">
                        от {tour.price.toLocaleString('ru-RU')} &#8381;
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        {tours.length > 0 && (
          <Reveal>
            <div className="flex justify-center mt-10">
              <Link
                href="/tours"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border border-[var(--kh-border)] rounded-lg text-[var(--kh-text)] hover:bg-[var(--kh-surface)] transition-colors"
              >
                Все туры <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
