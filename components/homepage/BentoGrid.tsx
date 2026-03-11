'use client';

import React from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/homepage/Reveal';

const FP = "var(--font-playfair,'Playfair Display',Georgia,serif)";

interface BentoItem {
  title: string;
  subtitle: string;
  tag?: string;
  tagColor: string;
  img: string | null;
  fallback: string;
  colSpan: number;
  rowSpan: number;
  href: string;
}

const ITEMS: BentoItem[] = [
  {
    title: 'Долина Гейзеров',
    subtitle: 'UNESCO · Вертолётный тур',
    tag: 'ТОП',
    tagColor: '#D44A0C',
    img: null,
    fallback: 'linear-gradient(135deg, #8B4513 0%, #CD853F 100%)',
    colSpan: 2,
    rowSpan: 2,
    href: '/tours?category=geyzery',
  },
  {
    title: 'Курильское озеро',
    subtitle: 'Медведи · Нерка',
    tag: 'СЕЗОН',
    tagColor: '#2568B0',
    img: null,
    fallback: 'linear-gradient(135deg, #2568B0 0%, #5A9DD6 100%)',
    colSpan: 1,
    rowSpan: 1,
    href: '/tours?category=lakes',
  },
  {
    title: 'Халактырский пляж',
    subtitle: 'Чёрный песок · Океан',
    tagColor: '',
    img: '/images/bento/khalaktyr.jpg',
    fallback: '',
    colSpan: 1,
    rowSpan: 1,
    href: '/tours?category=trekking',
  },
  {
    title: 'Мутновский вулкан',
    subtitle: 'Сложность Easy',
    tag: 'EASY',
    tagColor: '#4A6859',
    img: '/images/bento/mutnovsky.jpg',
    fallback: '',
    colSpan: 1,
    rowSpan: 2,
    href: '/tours?category=vulkani',
  },
  {
    title: 'Быстрая река',
    subtitle: 'Сплав · Рыбалка',
    tagColor: '',
    img: null,
    fallback: 'linear-gradient(135deg, #6B5B3E 0%, #8B7355 100%)',
    colSpan: 1,
    rowSpan: 1,
    href: '/tours?category=rivers',
  },
  {
    title: 'Паратунка',
    subtitle: 'Термальные источники · Релакс',
    tag: 'РЕЛАКС',
    tagColor: '#B8653E',
    img: '/images/bento/paratunka.jpg',
    fallback: '',
    colSpan: 2,
    rowSpan: 1,
    href: '/tours?category=termalnye_istochniki',
  },
];

export function BentoGrid() {
  return (
    <section style={{ padding: '24px 16px' }}>
      <Reveal>
        <h2
          style={{
            fontFamily: FP,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--kh-text)',
            marginBottom: '16px',
            paddingLeft: '4px',
          }}
        >
          Популярное
        </h2>
      </Reveal>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridAutoRows: '105px',
          gap: '8px',
        }}
      >
        {ITEMS.map((item, i) => (
          <Reveal
            key={item.title}
            delay={((i % 4) + 1) as 1 | 2 | 3 | 4}
            style={{
              gridColumn: item.colSpan > 1 ? `span ${item.colSpan}` : undefined,
              gridRow: item.rowSpan > 1 ? `span ${item.rowSpan}` : undefined,
            }}
          >
            <Link
              href={item.href}
              style={{
                position: 'relative',
                display: 'block',
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                textDecoration: 'none',
                background: item.img ? 'var(--kh-surface2)' : item.fallback,
                transition: 'transform 0.15s',
              }}
              onMouseDown={(e) => { (e.currentTarget.style.transform = 'scale(0.97)'); }}
              onMouseUp={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
              onTouchStart={(e) => { (e.currentTarget.style.transform = 'scale(0.97)'); }}
              onTouchEnd={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
            >
              {/* Photo */}
              {item.img && (
                <img
                  src={item.img}
                  alt={item.title}
                  loading="lazy"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}

              {/* Dark overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 60%)',
                }}
              />

              {/* Content */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  padding: '12px',
                }}
              >
                {/* Tag */}
                {item.tag && (
                  <span
                    style={{
                      alignSelf: 'flex-start',
                      fontSize: '8px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: item.tagColor,
                      color: '#fff',
                    }}
                  >
                    {item.tag}
                  </span>
                )}

                {/* Title + subtitle */}
                <div>
                  <h3
                    style={{
                      fontFamily: FP,
                      fontSize: item.colSpan > 1 || item.rowSpan > 1 ? '18px' : '14px',
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.2,
                      margin: 0,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.6)',
                      margin: '2px 0 0',
                    }}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
