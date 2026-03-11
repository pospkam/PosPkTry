'use client';

import React from 'react';
import { MapPin, TrendingUp, Users } from 'lucide-react';
import { Reveal } from '@/components/homepage/Reveal';

const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

interface FeedItem {
  icon: React.ReactNode;
  dotColor: string;
  text: string;
  time: string;
}

const FEED: FeedItem[] = [
  {
    icon: <MapPin size={14} />,
    dotColor: '#D44A0C',
    text: 'Добавлен новый тур на Горелый',
    time: '2ч назад',
  },
  {
    icon: <TrendingUp size={14} />,
    dotColor: '#2568B0',
    text: 'Обновлены цены рыбалки',
    time: '5ч назад',
  },
  {
    icon: <Users size={14} />,
    dotColor: '#22C55E',
    text: 'Новый оператор на платформе',
    time: 'Сегодня',
  },
];

export function LiveFeed() {
  return (
    <section style={{ padding: '16px 16px 0', fontFamily: FO }}>
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {/* Green pulse dot */}
          <span
            style={{
              position: 'relative',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#22C55E',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: '-3px',
                borderRadius: '50%',
                border: '1.5px solid #22C55E',
                animation: 'kh-feed-pulse 2s ease-out infinite',
              }}
            />
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#22C55E',
            }}
          >
            Сейчас
          </span>
        </div>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {FEED.map((item, i) => (
          <Reveal key={i} delay={((i + 1) as 1 | 2 | 3)}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'var(--kh-surface)',
                border: '1px solid var(--kh-border)',
                borderRadius: '12px',
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--kh-surface2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  color: 'var(--kh-text-dim)',
                }}
              >
                {item.icon}
                {/* Colored dot */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: item.dotColor,
                  }}
                />
              </div>

              {/* Text */}
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--kh-text)' }}>
                {item.text}
              </span>

              {/* Time */}
              <span style={{ fontSize: '10px', color: 'var(--kh-text-dim)', flexShrink: 0 }}>
                {item.time}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
