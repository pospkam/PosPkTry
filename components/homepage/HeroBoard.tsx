'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Bot, Map } from 'lucide-react';

const IMAGES = [
  { src: '/images/hero/IMG_20260316_133026.jpg', alt: 'Вулканы Камчатки' },
  { src: '/images/hero/IMG_20260316_133049.jpg', alt: 'Природа полуострова' },
  { src: '/images/hero/IMG_20260316_133133.jpg', alt: 'Дикий край' },
];

export function HeroBoard() {
  const [visible, setVisible] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setImgIdx(i => (i + 1) % IMAGES.length), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-[var(--bg-primary)]">
      {/* Background Images with standard Tailwind transitions */}
      {IMAGES.map((img, i) => (
        <div
          key={img.src}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            imgIdx === i ? 'opacity-60 scale-105' : 'opacity-0 scale-100'
          }`}
          style={{ transitionProperty: 'opacity, transform' }}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Editorial Overlays using CSS Variables */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-primary)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/60 via-transparent to-transparent" />

      <div className="relative z-10 container mx-auto px-6 md:px-12">
        <div className="max-w-4xl">
          {/* Magazine-style Top Label */}
          <div className={`mb-6 transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <span className="inline-block text-[11px] font-bold tracking-[0.5em] uppercase text-[var(--accent)] border-b border-[var(--accent)] pb-1">
              Kamchatka • The Last Frontier
            </span>
          </div>

          {/* Massive Editorial Headline */}
          <h1 
            className={`font-playfair font-bold leading-[0.9] text-[var(--text-primary)] transition-all duration-700 delay-200 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
            style={{ fontSize: 'clamp(3.5rem, 12vw, 8.5rem)' }}
          >
            Знай <br />
            <span className="text-[var(--accent)] italic">куда</span> идёшь
          </h1>

          {/* Refined Subheadline */}
          <div className={`mt-8 max-w-xl transition-all duration-700 delay-300 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed font-light">
              778 локаций, 294 маршрута и AI-проводник Кузьмич. <br className="hidden md:block" />
              Ваш цифровой штурман в самом диком регионе планеты.
            </p>
          </div>

          {/* Action Group */}
          <div className={`mt-12 flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-500 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <Link 
              href="/kuzmich/hub" 
              className="ds-btn ds-btn-primary gap-3 px-8 py-4"
            >
              <Bot size={18} />
              Открыть Хаб Кузьмича
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            
            <Link 
              href="/map" 
              className="ds-btn ds-btn-secondary gap-3 px-8 py-4"
            >
              <Map size={18} />
              Интерактивная карта
            </Link>
          </div>
        </div>
      </div>

      {/* Editorial Scroll Indicator */}
      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 transition-opacity duration-700 delay-700 ${visible ? 'opacity-50' : 'opacity-0'}`}>
        <span className="text-[9px] uppercase tracking-[0.3em] text-[var(--text-primary)] font-bold rotate-90 mb-4">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-[var(--text-primary)] to-transparent" />
      </div>
    </section>
  );
}
