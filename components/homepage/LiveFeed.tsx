'use client';

import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Reveal } from '@/components/homepage/Reveal';

const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

interface Review {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  tourName: string;
  createdAt: string;
}

function dotColor(rating: number): string {
  if (rating >= 5) return '#22C55E';
  if (rating >= 3) return '#D44A0C';
  return '#DC2626';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Только что';
  if (h < 24) return `${h}ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}д назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function LiveFeed() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch('/api/reviews?limit=5')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setReviews(d.data.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section style={{ padding: '16px 16px 0', fontFamily: FO }}>
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
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
            Отзывы туристов
          </span>
        </div>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {reviews.length === 0 ? (
          <Reveal>
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
                  color: 'var(--kh-text-dim)',
                }}
              >
                <Star size={14} />
              </div>
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--kh-text)' }}>
                Станьте первым, кто оставит отзыв
              </span>
            </div>
          </Reveal>
        ) : (
          reviews.map((review, i) => (
            <Reveal key={review.id} delay={((i + 1) as 1 | 2 | 3)}>
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
                  <Star size={14} />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-1px',
                      right: '-1px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: dotColor(review.rating),
                    }}
                  />
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    color: 'var(--kh-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <strong>{review.userName}</strong>{' '}
                  {review.comment.length > 45
                    ? review.comment.slice(0, 45) + '…'
                    : review.comment}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--kh-text-dim)', flexShrink: 0 }}>
                  {relativeTime(review.createdAt)}
                </span>
              </div>
            </Reveal>
          ))
        )}
      </div>
    </section>
  );
}
