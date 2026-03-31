/**
 * AffiliateFlightBanner — server component.
 * Fetches affiliate links server-side (API token never exposed to client).
 * Renders 8+ CTA cards for travel services (flights, hotels, tours, transfers, insurance, etc).
 */

import { Plane, Hotel, TrendingDown, MapPin, Car, Shield, Home, Compass } from 'lucide-react';
import { getKamchatkaAffiliateLinks, KAMCHATKA_URLS } from '@/lib/services/travelpayouts';
import { AffiliateCard } from './AffiliateCard';

// Только сервисы работающие в РФ
const CARD_CONFIG = [
  { key: 'flights_to_pkc', icon: Plane, title: 'Авиабилеты в Петропавловск', subtitle: 'Aviasales', color: 'ocean', btnStyle: 'ds-btn-primary' },
  { key: 'ostrovok_hotels', icon: Hotel, title: 'Отели на Камчатке', subtitle: 'Ostrovok', color: 'success', btnStyle: 'ds-btn-secondary' },
  { key: 'sutochno_apts', icon: Home, title: 'Квартиры посуточно', subtitle: 'Sutochno', color: 'accent', btnStyle: 'ds-btn-secondary' },
  { key: 'cheap_calendar', icon: TrendingDown, title: 'Календарь низких цен', subtitle: 'Aviasales', color: 'warning', btnStyle: 'ds-btn-secondary' },
  { key: 'tripster_excursions', icon: MapPin, title: 'Экскурсии от местных', subtitle: 'Tripster', color: 'accent', btnStyle: 'ds-btn-secondary' },
  { key: 'sputnik8_tours', icon: Compass, title: 'Туры и активности', subtitle: 'Sputnik8', color: 'ocean', btnStyle: 'ds-btn-secondary' },
  { key: 'cherehapa_insurance', icon: Shield, title: 'Страховка путешественника', subtitle: 'Cherehapa', color: 'danger', btnStyle: 'ds-btn-secondary' },
  { key: 'kiwitaxi_airport', icon: Car, title: 'Трансфер из аэропорта', subtitle: 'Kiwitaxi', color: 'ocean', btnStyle: 'ds-btn-secondary' },
] as const;

export async function AffiliateFlightBanner() {
  const links = await getKamchatkaAffiliateLinks();

  return (
    <section className="bg-[var(--bg-card)] border-y border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Heading */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Полная туристическая подготовка
          </p>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
            Всё для путешествия на <span className="text-[var(--accent)]">Камчатку</span>
          </h2>
          <p className="text-[var(--text-secondary)] mt-2 text-base">
            Билеты, отели, экскурсии, трансферы, страховка — всё в одном месте
          </p>
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CARD_CONFIG.map((card) => {
            const baseUrl = KAMCHATKA_URLS[card.key as keyof typeof KAMCHATKA_URLS] as string | undefined;
            const href = (baseUrl ? links[baseUrl] : undefined) || baseUrl || '#';
            return (
              <AffiliateCard
                key={card.key}
                partnerKey={card.key}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                color={card.color}
                btnStyle={card.btnStyle}
                href={href}
              />
            );
          })}
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-4">
          Партнёрские ссылки · Мы получаем комиссию, для вас цены не меняются
        </p>
      </div>
    </section>
  );
}
