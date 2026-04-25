'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const InteractiveMapPreview = dynamic(
  () => import('@/components/homepage/HomeMapPreview')
    .then(m => ({ default: m.HomeMapPreview })),
  { ssr: false, loading: () => null }
);

export function MapLazy() {
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-activate when visible in viewport for ~1s
  useEffect(() => {
    if (active) return;
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => setActive(true), 1000);
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [active]);

  // Click/keyboard to activate immediately
  const activate = () => setActive(true);

  if (active) {
    return <InteractiveMapPreview />;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-pointer group overflow-hidden"
      onClick={activate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && activate()}
      aria-label="Открыть интерактивную карту Камчатки"
    >
      <Image
        src="/images/map-preview.webp"
        alt="Интерактивная карта Камчатки с маршрутами — нажмите чтобы открыть"
        fill
        priority
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        onError={(e) => {
          // Fallback to SVG placeholder
          const target = e.currentTarget;
          target.src = '/images/map-preview-placeholder.svg';
        }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center
                   bg-black/0 group-hover:bg-black/25 transition-colors"
      >
        <span
          className="px-5 py-2.5 bg-white/95 rounded-full text-sm font-medium
                     shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
                     text-[var(--text-primary)]"
        >
          Открыть карту
        </span>
      </div>
    </div>
  );
}
