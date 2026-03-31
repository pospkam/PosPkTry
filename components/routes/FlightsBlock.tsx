'use client';

import { Plane, MapPin, Clock, DollarSign, ExternalLink } from 'lucide-react';
import { recommendFlights } from '@/lib/services/flights.service';

interface Props {
  departure_city_code?: string; // Detect from geolocation or user profile
}

/**
 * FlightsBlock — рекомендация рейсов до Петропавловска с Aviasales
 * Показывает основной маршрут + альтернативы
 */
export default function FlightsBlock({ departure_city_code }: Props) {
  try {
    const rec = recommendFlights(departure_city_code);

    return (
      <section className="mt-10 pt-8 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 mb-4">
          <Plane className="w-5 h-5" style={{ color: 'var(--ocean)' }} />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Авиабилеты до Камчатки</p>
        </div>

        {/* Основной маршрут */}
        <div
          className="rounded-lg border-2 p-4 mb-4 transition-all hover:shadow-sm"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--ocean)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-1">Рекомендуемый маршрут</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[var(--text-primary)]">{rec.primary_route.departure_city}</p>
                <Plane className="w-4 h-4" style={{ color: 'var(--ocean)' }} />
                <p className="font-semibold text-[var(--text-primary)]">{rec.primary_route.arrival_city}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-[var(--accent)]">от {rec.primary_route.price_from_rub.toLocaleString('ru-RU')} ₽</p>
              <p className="text-xs text-[var(--text-muted)]">на чел</p>
            </div>
          </div>

          {/* Детали */}
          <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[var(--text-secondary)]">{rec.primary_route.duration_hours.toFixed(1)} часов</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[var(--text-secondary)]">{rec.primary_route.stops === 0 ? 'Прямой' : `${rec.primary_route.stops} пересадка`}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[var(--text-secondary)]">~{rec.avg_price.toLocaleString('ru-RU')} ₽ средняя</span>
            </div>
          </div>

          {/* Сезонная заметка */}
          <p className="text-xs text-[var(--text-muted)] mb-3">{rec.seasonal_notes}</p>

          {/* CTA */}
          <a
            href={rec.primary_route.link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all hover:shadow-sm"
            style={{
              background: 'var(--ocean)',
              color: 'white',
            }}
          >
            Поиск билетов на Aviasales
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Альтернативные маршруты */}
        {rec.alternative_routes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Из других городов</p>
            {rec.alternative_routes.map(flight => (
              <a
                key={flight.id}
                href={flight.link}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="group flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{flight.departure_city}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {flight.duration_hours.toFixed(1)}ч • {flight.stops === 0 ? 'прямой' : `${flight.stops} ост`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-[var(--accent)]">от {flight.price_from_rub.toLocaleString('ru-RU')} ₽</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    );
  } catch (error) {
    // Silent fail — если сервис упал, не показываем ошибку
    return null;
  }
}
