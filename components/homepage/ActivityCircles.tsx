'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/homepage/Reveal';

const FP = "var(--font-playfair,'Playfair Display',Georgia,serif)";
const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

const ACTIVITIES = [
  { label: 'Вулканы',   img: '/images/activities/volcanoes.jpg',   href: '/tours?category=vulkani' },
  { label: 'Рыбалка',   img: '/images/activities/fishing.jpg',     href: '/tours?category=rybalka' },
  { label: 'Термы',     img: '/images/activities/hotsprings.jpg',  href: '/tours?category=termalnye_istochniki' },
  { label: 'Сплавы',    img: null,                                  href: '/tours?category=rivers', fallback: 'linear-gradient(135deg, #D44A0C, #E8730E)' },
  { label: 'Морские',   img: '/images/activities/sea.jpg',         href: '/tours?category=morskie_progulki' },
  { label: 'Медведи',   img: null,                                  href: '/tours?category=medvedi', fallback: 'linear-gradient(135deg, #6B5B3E, #8B7355)' },
  { label: 'Вертолёты', img: '/images/activities/helicopter.jpg',  href: '/tours?category=vertoletnye_tury' },
  { label: 'Снегоход',  img: '/images/activities/snowmobile.jpg',  href: '/tours?category=snegohod' },
];

export function ActivityCircles() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section style={{ padding: '24px 0 16px' }}>
      <Reveal>
        <h2
          style={{
            fontFamily: FP,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--kh-text)',
            padding: '0 20px',
            marginBottom: '16px',
          }}
        >
          Активности
        </h2>
      </Reveal>

      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '12px',
          padding: '0 20px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {ACTIVITIES.map((a, i) => (
          <Reveal key={a.label} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
            <Link
              href={a.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                scrollSnapAlign: 'center',
                flexShrink: 0,
                transition: 'transform 0.15s',
              }}
              onMouseDown={(e) => { (e.currentTarget.style.transform = 'scale(0.92)'); }}
              onMouseUp={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
              onTouchStart={(e) => { (e.currentTarget.style.transform = 'scale(0.92)'); }}
              onTouchEnd={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid var(--kh-surface)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  background: a.img ? undefined : (a.fallback ?? 'var(--kh-surface2)'),
                }}
              >
                {a.img && (
                  <img
                    src={a.img}
                    alt={a.label}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontFamily: FO,
                  fontSize: '10px',
                  color: 'var(--kh-text-dim)',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.label}
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      {/* Hide scrollbar */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
