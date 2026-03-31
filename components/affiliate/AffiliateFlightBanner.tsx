/**
 * AffiliateFlightBanner — server component.
 * Fetches affiliate links server-side (API token never exposed to client).
 * Renders 8+ CTA cards for travel services (flights, hotels, tours, transfers, insurance, etc).
 */

import { Plane, Hotel, TrendingDown, MapPin, Car, Shield, Volume2, Building2 } from 'lucide-react';
import { getKamchatkaAffiliateLinks, KAMCHATKA_URLS } from '@/lib/services/travelpayouts';

const CARD_CONFIG = [
  {
    key: 'flights_to_pkc' as const,
    icon: Plane,
    title: 'Авиабилеты в Петропавловск',
    subtitle: 'Aviasales · 750+ авиакомпаний',
    color: 'ocean',
    btnStyle: 'ds-btn-primary',
  },
  {
    key: 'hotels_pkc' as const,
    icon: Hotel,
    title: 'Отели на Камчатке',
    subtitle: 'Hotellook · 2 млн вариантов',
    color: 'success',
    btnStyle: 'ds-btn-secondary',
  },
  {
    key: 'cheap_calendar' as const,
    icon: TrendingDown,
    title: 'Календарь низких цен',
    subtitle: 'Aviasales · лучший месяц',
    color: 'warning',
    btnStyle: 'ds-btn-secondary',
  },
  {
    key: 'tripster_excursions' as const,
    icon: MapPin,
    title: 'Экскурсии от местных',
    subtitle: 'Tripster · 22k туров',
    color: 'accent',
    btnStyle: 'ds-btn-secondary',
  },
  {
    key: 'kiwitaxi_airport' as const,
    icon: Car,
    title: 'Трансфер из аэропорта',
    subtitle: 'Kiwitaxi · 150+ стран',
    color: 'ocean',
    btnStyle: 'ds-btn-secondary',
  },
  {
    key: 'cherehapa_insurance' as const,
    icon: Shield,
    title: 'Страховка путешественника',
    subtitle: 'Cherehapa · до 30% комиссия',
    color: 'danger',
    btnStyle: 'ds-btn-secondary',
  },
  {
    key: 'getrentacar_pkc' as const,
    icon: Car,
    title: 'Прокат автомобилей',
    subtitle: 'GetRentaCar · 10% комиссия',
    color: 'ocean',
    btnStyle: 'ds-btn-secondary',
  },
  {
    key: 'wegotrip_audio' as const,
    icon: Volume2,
    title: 'Аудиоэкскурсии',
    subtitle: 'WeGoTrip · билеты в музеи',
    color: 'success',
    btnStyle: 'ds-btn-secondary',
  },
] as const;

const colorMap: Record<string, string> = {
  ocean: 'text-[var(--ocean)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  accent: 'text-[var(--accent)]',
  danger: 'text-[var(--danger)]',
};

const bgColorMap: Record<string, string> = {
  ocean: 'bg-[var(--ocean)]/10',
  success: 'bg-[var(--success)]/10',
  warning: 'bg-[var(--warning)]/10',
  accent: 'bg-[var(--accent)]/10',
  danger: 'bg-[var(--danger)]/10',
};

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
            const Icon = card.icon;
            const href = links[card.key] || (KAMCHATKA_URLS[card.key] as string);

            return (
              <a
                key={card.key}
                href={href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="ds-card rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-[var(--border)]"
              >
                <div className={`w-8 h-8 rounded-md ${bgColorMap[card.color]} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${colorMap[card.color]}`} />
                </div>
                <div>
                  <div className="font-medium text-sm text-[var(--text-primary)] leading-snug">
                    {card.title}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {card.subtitle}
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span className={`${card.btnStyle} text-xs w-full text-center block px-2 py-1.5`}>
                    Перейти
                  </span>
                </div>
              </a>
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
