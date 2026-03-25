'use client';

import { useState, useEffect } from 'react';
import { MapPin, Users, Shield, Star } from 'lucide-react';

interface Review {
  id: number;
  rating: number;
  comment: string;
  author_name: string;
  tour_title?: string;
}

const STATS = [
  { icon: MapPin, label: 'Маршрутов', value: '1 000+' },
  { icon: Users, label: 'Операторов', value: '18' },
  { icon: Shield, label: 'SOS', value: '24/7' },
  { icon: Star, label: 'Рейтинг', value: '4.8' },
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
    <section className="py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--accent)]/10 mb-3">
                <Icon className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <p className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-1">
                {value}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{label}</p>
            </div>
          ))}
        </div>

        {/* Reviews */}
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
                  {/* Stars */}
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
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {review.author_name}
                    </p>
                    {review.tour_title && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {review.tour_title}
                      </p>
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
