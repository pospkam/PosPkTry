'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, ArrowRight, MapPin } from 'lucide-react';
import { Reveal } from '@/components/homepage/Reveal';

interface FeaturedItem {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  duration: number;
  price: number;
  rating: number;
  image: string;
  href: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  vulkani: 'Вулканы', rybalka: 'Рыбалка', termalnye_istochniki: 'Термальные',
  morskie_progulki: 'Морские', vertoletnye_tury: 'Вертолёты', snegohod: 'Снегоходы',
  trekking: 'Треккинг', medvedi: 'Медведи', lakes: 'Озёра', rivers: 'Реки',
  mountains: 'Горы', eco: 'Эко', geyzery: 'Гейзеры', dzhip: 'Джип',
};

const CATEGORY_IMAGES: Record<string, string> = {
  vulkani:           '/images/activities/volcanoes.jpg',
  rybalka:           '/images/activities/fishing.jpg',
  morskie_progulki:  '/images/activities/sea.jpg',
  vertoletnye_tury:  '/images/activities/helicopter.jpg',
  trekking:          '/images/activities/trekking.jpg',
  medvedi:           '/images/activities/bears.jpg',
};
const DEFAULT_IMAGE = '/images/hero/hero-light.jpg';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Легкий', medium: 'Средний', hard: 'Сложный',
  легкий: 'Легкий', средний: 'Средний', сложный: 'Сложный',
};

export function FeaturedTours() {
  const [items, setItems]     = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromRoutes, setFromRoutes] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Сначала туры от операторов
        const r1 = await fetch('/api/tours?limit=4').then(r => r.json());
        if (r1.success && r1.data?.tours?.length > 0) {
          setItems(r1.data.tours.map((t: {
            id: string; name: string; category: string; difficulty: string;
            duration: number; price: number; rating: number; images: string[];
          }) => ({
            id: t.id, name: t.name, category: t.category,
            difficulty: t.difficulty, duration: t.duration,
            price: t.price, rating: t.rating,
            image: t.images?.[0] || CATEGORY_IMAGES[t.category] || DEFAULT_IMAGE,
            href: `/tours/${t.id}`,
          })));
          return;
        }
        // Fallback — маршруты из agent_route_knowledge
        const r2 = await fetch('/api/routes?limit=4&sort=title').then(r => r.json());
        if (r2.success && r2.data?.length > 0) {
          setFromRoutes(true);
          setItems(r2.data.map((rt: {
            id: string; title: string; category: string;
            difficulty?: string; duration_days?: number; price_from?: number;
          }) => ({
            id: rt.id, name: rt.title, category: rt.category,
            difficulty: rt.difficulty ?? '',
            duration: rt.duration_days ?? 0,
            price: rt.price_from ?? 0,
            rating: 0,
            image: CATEGORY_IMAGES[rt.category] || DEFAULT_IMAGE,
            href: `/routes/${rt.id}`,
          })));
        }
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--kh-text)] mb-2">
            {fromRoutes ? 'Популярные маршруты' : 'Популярные туры'}
          </h2>
          <p className="text-[var(--kh-text-dim)] text-sm mb-8">
            {fromRoutes
              ? 'Лучшие маршруты Камчатки — от вулканов до океана'
              : 'Реальные предложения от проверенных операторов'}
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
                  <div className="ds-skeleton h-6 w-1/3 rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map(item => (
              <Reveal key={item.id}>
                <Link
                  href={item.href}
                  className="group bg-[var(--kh-surface)] border border-[var(--kh-border)] rounded-lg overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {item.difficulty && (
                      <span className="absolute top-3 left-3 px-2 py-1 text-[10px] font-semibold uppercase rounded bg-[var(--kh-accent)] text-white">
                        {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
                      </span>
                    )}
                    {item.rating > 0 && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 text-[var(--kh-accent)] fill-[var(--kh-accent)]" />
                        <span className="text-white text-xs font-bold">{item.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--kh-text-dim)] mb-1">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </p>
                    <h3 className="font-playfair text-base font-bold text-[var(--kh-text)] group-hover:text-[var(--kh-accent)] transition-colors line-clamp-2">
                      {item.name}
                    </h3>
                    {item.duration > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-[var(--kh-text-dim)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.duration} {item.duration === 1 ? 'день' : item.duration < 5 ? 'дня' : 'дней'}</span>
                      </div>
                    )}
                    <div className="mt-auto pt-3">
                      {item.price > 0 ? (
                        <span className="text-lg font-bold text-[var(--kh-accent)]">
                          от {item.price.toLocaleString('ru-RU')} &#8381;
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-[var(--kh-text-dim)]">
                          <MapPin className="w-3.5 h-3.5" /> Уточнить цену
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : null}

        {items.length > 0 && (
          <Reveal>
            <div className="flex justify-center mt-10">
              <Link
                href={fromRoutes ? '/routes' : '/tours'}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border border-[var(--kh-border)] rounded-lg text-[var(--kh-text)] hover:bg-[var(--kh-surface)] transition-colors"
              >
                {fromRoutes ? 'Все маршруты' : 'Все туры'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
