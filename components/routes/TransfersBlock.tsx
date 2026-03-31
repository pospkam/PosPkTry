'use client';

import { Car, MapPin, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { recommendTransfers, estimateLogisticsCost } from '@/lib/services/transfers.service';

interface Props {
  activity_type?: string;
}

export default function TransfersBlock({ activity_type }: Props) {
  try {
    const rec = recommendTransfers(activity_type);
    const logistics = estimateLogisticsCost(activity_type);

    return (
      <section className="mt-10 pt-8 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 mb-4">
          <Car className="w-5 h-5" style={{ color: 'var(--success)' }} />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Логистика и трансферы</p>
        </div>

        {/* Out & Back */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* AirportToCity */}
          <div
            className="rounded-lg border p-3"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">Аэропорт → Город</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{rec.airport_to_city.name}</p>
            <div className="space-y-1 text-xs text-[var(--text-secondary)] mb-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{rec.airport_to_city.duration_minutes} мин
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                До 4 чел
              </div>
            </div>
            <p className="text-lg font-bold text-[var(--success)]">{rec.airport_to_city.price_rub} ₽</p>
          </div>

          {/* CityToTour */}
          <div
            className="rounded-lg border p-3"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">До места тура</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{rec.city_to_tour.name}</p>
            <div className="space-y-1 text-xs text-[var(--text-secondary)] mb-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{rec.city_to_tour.duration_minutes} мин
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                До {rec.city_to_tour.capacity} чел
              </div>
            </div>
            <p className="text-lg font-bold text-[var(--success)]">{rec.city_to_tour.price_rub} ₽</p>
          </div>
        </div>

        {/* Общая стоимость логистики */}
        <div
          className="rounded-lg p-4 mb-4"
          style={{
            background: 'var(--bg-primary)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--text-secondary)]">Туда-обратно:</p>
            <p className="text-lg font-bold text-[var(--accent)]">{logistics.total.toLocaleString('ru-RU')} ₽</p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {rec.airport_to_city.price_rub * 2 + rec.city_to_tour.price_rub * 2} ₽ (включая обратный путь)
          </p>
        </div>

        {/* Заметки */}
        <div className="flex gap-2 p-3 rounded-lg mb-4" style={{ background: 'var(--bg-card)', borderLeft: '3px solid var(--warning)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
          <p className="text-xs text-[var(--text-secondary)]">
            {rec.city_to_tour.notes}. <strong>Заказывайте заранее</strong> — водители часто заняты в пиковый сезон
          </p>
        </div>

        {/* CTA */}
        <a
          href={rec.city_to_tour.link}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all"
          style={{
            background: 'var(--success)',
            color: 'white',
          }}
        >
          Заказать на Kiwitaxi
          <ExternalLink className="w-4 h-4" />
        </a>
      </section>
    );
  } catch {
    return null;
  }
}
