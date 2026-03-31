/**
 * AffiliateFlightBanner — server component.
 * Fetches affiliate links server-side (API token never exposed to client).
 * Renders a flight + hotel CTA section for the homepage.
 */

import { Plane, Hotel, TrendingDown } from 'lucide-react';
import { getKamchatkaAffiliateLinks } from '@/lib/services/travelpayouts';

export async function AffiliateFlightBanner() {
  const links = await getKamchatkaAffiliateLinks();

  return (
    <section className="bg-[var(--bg-card)] border-y border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Heading */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Добраться до Камчатки
          </p>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
            Билеты и отели — <span className="text-[var(--accent)]">лучшие цены</span>
          </h2>
          <p className="text-[var(--text-secondary)] mt-2 text-base">
            Петропавловск-Камчатский (PKC) · Сравниваем 750+ авиакомпаний и 2 млн отелей
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Flights */}
          <a
            href={links.flights}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group ds-card rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-[var(--border)]"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--ocean)]/10 flex items-center justify-center">
              <Plane className="w-5 h-5 text-[var(--ocean)]" />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)] mb-1">
                Авиабилеты в Петропавловск
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Прямые и с пересадками · Aviasales
              </div>
            </div>
            <div className="mt-auto">
              <span className="ds-btn ds-btn-primary text-sm w-full text-center block">
                Найти билеты
              </span>
            </div>
          </a>

          {/* Hotels */}
          <a
            href={links.hotels}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group ds-card rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-[var(--border)]"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
              <Hotel className="w-5 h-5 text-[var(--success)]" />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)] mb-1">
                Отели на Камчатке
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                2 млн вариантов · Hotellook
              </div>
            </div>
            <div className="mt-auto">
              <span className="ds-btn ds-btn-secondary text-sm w-full text-center block">
                Найти отель
              </span>
            </div>
          </a>

          {/* Cheap calendar */}
          <a
            href={links.cheap}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group ds-card rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-[var(--border)]"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[var(--warning)]" />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)] mb-1">
                Календарь низких цен
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Лучший месяц для поездки
              </div>
            </div>
            <div className="mt-auto">
              <span className="ds-btn ds-btn-secondary text-sm w-full text-center block">
                Смотреть цены
              </span>
            </div>
          </a>

        </div>

        <p className="text-xs text-[var(--text-muted)] mt-4 text-right">
          Партнёрские ссылки · Цены обновляются в реальном времени
        </p>
      </div>
    </section>
  );
}
