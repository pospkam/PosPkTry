'use client';

import { useState, useEffect } from 'react';
import { Star, ShieldCheck, MapPin, Users } from 'lucide-react';

interface Review {
  id: number;
  rating: number;
  comment: string;
  author_name: string;
  tour_title?: string;
}

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Проверенные исполнители',
    desc: 'Если рекомендуем тур или гида, то только после проверки документов, репутации и реальных отзывов.',
  },
  {
    icon: MapPin,
    title: 'Планирование маршрута',
    desc: 'Маршруты, объекты и логика поездки в одном контуре: от идеи путешествия до конкретного плана.',
  },
  {
    icon: Users,
    title: 'Поддержка и безопасность',
    desc: 'Кузьмич, SOS-контур и живые координаторы помогают не потеряться до поездки и на маршруте.',
  },
];

export function TrustSection() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch('/api/reviews?limit=3')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setReviews(d.data?.slice(0, 3) || []))
      .catch(() => {});
  }, []);

  return (
    <section className="py-20 md:py-28 px-5 bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto">

        {/* Trust items — always visible */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {TRUST_ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                <Icon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reviews — only when data available */}
        {reviews.length > 0 && (
          <>
            <h2 className="font-playfair text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-10">
              Отзывы туристов
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              {reviews.map(review => (
                <div
                  key={review.id}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6"
                >
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4"
                        fill={i < review.rating ? 'var(--accent)' : 'none'}
                        stroke={i < review.rating ? 'var(--accent)' : 'var(--text-muted)'}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed line-clamp-4 mb-4">
                    {review.comment}
                  </p>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{review.author_name}</p>
                    {review.tour_title && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{review.tour_title}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
