'use client';

import { ExternalLink, Plane, Hotel, Shield, Car, Map } from 'lucide-react';
import { trackLeadEvent, LEAD_EVENTS } from '@/lib/analytics/lead-tracking';

const MARKER = '402896'; // TravelPayouts partner marker (tourhab.ru)

interface Service {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  url: string;
  color: string;
  activities?: string[]; // показывать только для этих типов; undefined = всегда
}

const SERVICES: Service[] = [
  {
    icon: Plane,
    label: 'Авиабилеты на Камчатку',
    desc: 'Aviasales — лучшие цены',
    url: `https://www.aviasales.ru/search/MOW0000PKC1?marker=${MARKER}`,
    color: 'var(--ocean)',
  },
  {
    icon: Hotel,
    label: 'Отели в Петропавловске',
    desc: 'Hotellook — 500+ вариантов',
    url: `https://hotellook.com/?marker=${MARKER}`,
    color: 'var(--accent)',
  },
  {
    icon: Shield,
    label: 'Страховка для путешествия',
    desc: 'Cherehapa — обязательна для экстрима',
    url: `https://cherehapa.ru/?marker=${MARKER}`,
    color: 'var(--warning)',
    activities: ['trekking', 'helicopter', 'bear_watching', 'fishing', 'snowmobile', 'diving', 'surf', 'ski'],
  },
  {
    icon: Car,
    label: 'Трансфер из аэропорта',
    desc: 'Kiwitaxi — надёжно и заранее',
    url: `https://kiwitaxi.ru/PKC?aff_id=${MARKER}`,
    color: 'var(--success)',
  },
  {
    icon: Map,
    label: 'Экскурсии на Камчатке',
    desc: 'Tripster — авторские туры',
    url: `https://tripster.ru/kamchatka/?partner=${MARKER}`,
    color: 'var(--ocean)',
    activities: ['cultural', 'photo', 'sightseeing', 'eco', 'other'],
  },
];

interface Props {
  activityType?: string | null;
}

/**
 * Блок партнёрских предложений на странице маршрута.
 * Контекстно показывает релевантные сервисы из TravelPayouts (69 партнёров).
 * Marker: 402896 (tourhab.ru)
 */
export default function RouteAffiliateBlock({ activityType }: Props) {
  const visible = SERVICES.filter(s =>
    !s.activities || s.activities.includes(activityType ?? '')
  );

  if (visible.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-[var(--border)]">
      <p className="text-[11px] uppercase tracking-widest font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>
        Полезно для вашего путешествия
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {visible.map(s => (
          <a
            key={s.label}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => trackLeadEvent({
              ...LEAD_EVENTS.CLICK_AFFILIATE_LINK,
              event_label: s.label,
              route_id: activityType || undefined,
            })}
            className="group flex flex-col gap-1.5 p-3 rounded-lg border transition-all hover:shadow-sm hover:-translate-y-0.5"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div style={{ color: s.color }}>
                <s.icon className="w-4 h-4" />
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
              </div>
            </div>
            <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {s.label}
            </p>
            <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              {s.desc}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
