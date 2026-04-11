'use client';

import { ExternalLink, Plane, Hotel, Shield, Car, Map, Home, Compass, Navigation } from 'lucide-react';
import { trackLeadEvent, LEAD_EVENTS } from '@/lib/analytics/lead-tracking';

const MARKER = '402896';
const TP_SUBID = `c263579cf498437d8ef255a43-${MARKER}`;

interface Service {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  url: string;
  color: string;
  activities?: string[];
}

// 8 сервисов, все работают в РФ. Порядок = приоритет для туриста на Камчатке.
const SERVICES: Service[] = [
  {
    key: 'aviasales',
    icon: Plane,
    label: 'Авиабилеты на Камчатку',
    desc: 'Aviasales — лучшие цены на рейсы до PKC',
    url: `https://www.aviasales.ru/search/MOW0000PKC1?marker=${MARKER}`,
    color: 'var(--ocean)',
  },
  {
    key: 'yandex_travel',
    icon: Navigation,
    label: 'Яндекс Путешествия',
    desc: 'Отели, билеты, туры — всё в одном',
    url: `https://yandex.travel/hotels/petropavlovsk-kamchatsky/?clid=4910087&affiliate_vid=${MARKER}&erid=2VtzqvFodjU&travelpayouts_uid=${TP_SUBID}&utm_campaign=tourhab.ru&utm_medium=cpa&utm_source=travelpayouts`,
    color: 'var(--accent)',
  },
  {
    key: 'ostrovok',
    icon: Hotel,
    label: 'Отели в Петропавловске',
    desc: 'Ostrovok — российский сервис бронирования',
    url: `https://ostrovok.ru/hotel/russia/petropavlovsk_kamchatsky/?marker=${MARKER}`,
    color: 'var(--ocean)',
  },
  {
    key: 'sutochno',
    icon: Home,
    label: 'Квартиры посуточно',
    desc: 'Sutochno — жильё на 7-14 дней поездки',
    url: `https://sutochno.ru/petropavlovsk-kamchatskiy?marker=${MARKER}`,
    color: 'var(--success)',
  },
  {
    key: 'cherehapa',
    icon: Shield,
    label: 'Страховка для путешествия',
    desc: 'Cherehapa — обязательна для экстрима',
    url: `https://cherehapa.ru/?marker=${MARKER}`,
    color: 'var(--warning)',
    activities: ['trekking', 'helicopter', 'bear_watching', 'fishing', 'snowmobile', 'diving', 'surf', 'ski'],
  },
  {
    key: 'tripster',
    icon: Map,
    label: 'Экскурсии на Камчатке',
    desc: 'Tripster — авторские туры от местных',
    url: `https://experience.tripster.ru/kamchatka/?erid=2VtzqvHHd1p&exp_partner=travelpayouts&exp_subpartner=${TP_SUBID}&partner=${MARKER}&utm_campaign=affiliates&utm_medium=link&utm_source=travelpayouts`,
    color: 'var(--ocean)',
  },
  {
    key: 'sputnik8',
    icon: Compass,
    label: 'Туры и активности',
    desc: 'Sputnik8 — групповые и индивидуальные',
    url: `https://www.sputnik8.com/ru/petropavlovsk-kamchatsky?marker=${MARKER}`,
    color: 'var(--accent)',
  },
  {
    key: 'kiwitaxi',
    icon: Car,
    label: 'Трансфер из аэропорта',
    desc: 'Kiwitaxi — бронирование заранее',
    url: `https://kiwitaxi.ru/?aff_id=${MARKER}`,
    color: 'var(--text-muted)',
    activities: ['helicopter', 'fishing', 'bear_watching', 'trekking', 'snowmobile'],
  },
];

interface Props {
  activityType?: string | null;
  routeId?: string;
}

function trackClick(service: Service, routeId?: string) {
  // Yandex Metrika + GA
  trackLeadEvent({
    ...LEAD_EVENTS.CLICK_AFFILIATE_LINK,
    event_label: service.label,
    route_id: routeId,
  });

  // DB tracking (fire-and-forget)
  fetch('/api/analytics/affiliate-clicks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner: service.key,
      source: routeId ? `route_${routeId}` : 'route_detail',
      subId: routeId,
      referrer: typeof window !== 'undefined' ? window.location.href : null,
    }),
  }).catch(() => {/* fire-and-forget */});
}

export default function RouteAffiliateBlock({ activityType, routeId }: Props) {
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
            key={s.key}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => trackClick(s, routeId)}
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
      <p className="mt-3 text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)', opacity: 0.55 }}>
        Реклама. ООО «КЕХ еКоммерц», ИНН: 7710668349. Go Travel Un Limited, ИНН: 9909520797.
        Flight Marketplace Admin FZE, ИНН: 9909618947. ООО «Яндекс Вертикали», ИНН: 7736207543.
        ООО «Спутник», ИНН: 7814547081.
      </p>
    </section>
  );
}
