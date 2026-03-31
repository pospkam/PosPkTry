'use client';

import { Building2, MapPin, Star, Wifi, UtensilsCrossed, ExternalLink } from 'lucide-react';
import { recommendHotels, estimateAccommodationCost } from '@/lib/services/hotels.service';

interface Props {
  nights?: number;
  budget_per_night_rub?: number;
}

export default function HotelsBlock({ nights = 3, budget_per_night_rub }: Props) {
  try {
    const rec = recommendHotels(budget_per_night_rub, nights);
    const cost = estimateAccommodationCost(nights, rec.primary_hotel.price_from_rub);

    return (
      <section className="mt-10 pt-8 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Отели в Петропавловске</p>
        </div>

        {/* Основной отель */}
        <div
          className="rounded-lg border-2 p-4 mb-4 transition-all hover:shadow-sm"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--accent)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">{rec.primary_hotel.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: rec.primary_hotel.stars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5" fill="currentColor" style={{ color: 'var(--warning)' }} />
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-[var(--accent)]">{rec.primary_hotel.price_from_rub.toLocaleString('ru-RU')} ₽</p>
              <p className="text-xs text-[var(--text-muted)]">за ночь</p>
            </div>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mb-3">{rec.primary_hotel.area}</p>

          {/* Удобства */}
          <div className="flex flex-wrap gap-2 mb-3">
            {rec.primary_hotel.amenities.map(a => (
              <span key={a} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                {a}
              </span>
            ))}
          </div>

          {/* Стоимость */}
          <div className="bg-[var(--bg-primary)] rounded p-2 mb-3 text-sm">
            <p className="text-[var(--text-secondary)]">
              {nights} ночей: <span className="font-semibold text-[var(--accent)]">{cost.subtotal.toLocaleString('ru-RU')} ₽</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              + еда (~1500 ₽/день) = {cost.with_meals.toLocaleString('ru-RU')} ₽
            </p>
          </div>

          <p className="text-xs text-[var(--text-muted)] mb-3">{rec.tips}</p>

          <a
            href={rec.primary_hotel.link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all"
            style={{
              background: 'var(--accent)',
              color: 'white',
            }}
          >
            Забронировать на Ostrovok
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Альтернативы */}
        {rec.alternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Также доступны</p>
            {rec.alternatives.map(hotel => (
              <a
                key={hotel.id}
                href={hotel.link}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="group flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{hotel.name}</p>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1">{hotel.area}</p>
                </div>
                <p className="text-sm font-bold text-[var(--accent)] flex-shrink-0 ml-3">
                  {hotel.price_from_rub.toLocaleString('ru-RU')} ₽
                </p>
              </a>
            ))}
          </div>
        )}
      </section>
    );
  } catch {
    return null;
  }
}
