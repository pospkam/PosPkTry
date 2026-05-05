'use client';

import { Plane, Hotel, Package, ExternalLink, ArrowRight } from 'lucide-react';
import { trackLeadEvent, LEAD_EVENTS } from '@/lib/analytics/lead-tracking';

const CLID = '4910087';
const MARKER = '402896';
const TP_SUBID = `c263579cf498437d8ef255a43-${MARKER}`;

// erid для каждого блока (Закон о рекламе)
const ERID_HOTELS  = '2VtzqvFodjU';
const ERID_FLIGHTS = '2VtzqxE35e8';
const ERID_TOURS   = '2VtzqvFodjU';

interface Card {
  key: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  heading: string;
  sub: string;
  badge: string;
  url: string;
  erid: string;
  accent: string;
}

const CARDS: Card[] = [
  {
    key: 'yt_flights',
    icon: Plane,
    heading: 'Авиабилеты',
    sub: 'Москва → ПКЧ от 27 000 ₽',
    badge: 'Яндекс',
    url: `https://yandex.travel/flights/?clid=${CLID}&affiliate_vid=${MARKER}&erid=${ERID_FLIGHTS}&travelpayouts_uid=${TP_SUBID}&utm_campaign=tourhab.ru&utm_medium=cpa&utm_source=travelpayouts`,
    erid: ERID_FLIGHTS,
    accent: 'var(--ocean)',
  },
  {
    key: 'yt_hotels',
    icon: Hotel,
    heading: 'Отели',
    sub: 'Петропавловск-Камчатский от 3 500 ₽/ночь',
    badge: 'Яндекс',
    url: `https://yandex.travel/hotels/petropavlovsk-kamchatsky/?clid=${CLID}&affiliate_vid=${MARKER}&erid=${ERID_HOTELS}&travelpayouts_uid=${TP_SUBID}&utm_campaign=tourhab.ru&utm_medium=cpa&utm_source=travelpayouts`,
    erid: ERID_HOTELS,
    accent: 'var(--accent)',
  },
  {
    key: 'yt_tours',
    icon: Package,
    heading: 'Пакетные туры',
    sub: 'Готовые туры на Камчатку',
    badge: 'Яндекс',
    url: `https://yandex.travel/tours/kamchatka/?clid=${CLID}&affiliate_vid=${MARKER}&erid=${ERID_TOURS}&travelpayouts_uid=${TP_SUBID}&utm_campaign=tourhab.ru&utm_medium=cpa&utm_source=travelpayouts`,
    erid: ERID_TOURS,
    accent: 'var(--success)',
  },
];

interface Props {
  routeId?: string;
  source?: string;
}

function trackClick(cardKey: string, source: string, routeId?: string) {
  trackLeadEvent({
    ...LEAD_EVENTS.CLICK_AFFILIATE_LINK,
    event_label: `yandex_travel_${cardKey}`,
    route_id: routeId,
  });

  fetch('/api/analytics/affiliate-clicks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner: cardKey,
      source,
      subId: routeId,
      referrer: typeof window !== 'undefined' ? window.location.href : null,
    }),
  }).catch(() => {/* fire-and-forget */});
}

export default function YandexTravelBlock({ routeId, source = 'route_detail' }: Props) {
  return (
    <section className="mt-10 pt-8 border-t border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <span className="text-[9px] font-black text-white leading-none">Я</span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Яндекс Путешествия
          </p>
        </div>
        <a
          href={`https://yandex.travel/?clid=${CLID}&utm_campaign=tourhab.ru&utm_medium=cpa&utm_source=travelpayouts`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex items-center gap-1 text-xs hover:underline"
          style={{ color: 'var(--ocean)' }}
          onClick={() => trackClick('yt_main', source, routeId)}
        >
          Открыть <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {CARDS.map(card => (
          <a
            key={card.key}
            href={card.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => trackClick(card.key, source, routeId)}
            className="group flex flex-col gap-2 p-3.5 rounded-lg border transition-all hover:shadow-sm hover:-translate-y-0.5"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between">
              <div className="p-1.5 rounded-md" style={{ background: `color-mix(in srgb, ${card.accent} 12%, transparent)` }}>
                <card.icon className="w-4 h-4" style={{ color: card.accent }} />
              </div>
              <ExternalLink className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-30 transition-opacity" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {card.heading}
              </p>
              <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {card.sub}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Legal */}
      <p className="mt-3 text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
        Реклама. ООО «Яндекс Вертикали», ИНН: 7736207543. erid: {ERID_HOTELS}, {ERID_FLIGHTS}.
      </p>
    </section>
  );
}
