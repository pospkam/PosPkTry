'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import YandexTravelBlock from '@/components/routes/YandexTravelBlock';
import FlightsBlock from '@/components/routes/FlightsBlock';
import HotelsBlock from '@/components/routes/HotelsBlock';
import TransfersBlock from '@/components/routes/TransfersBlock';
import InsuranceBlock from '@/components/routes/InsuranceBlock';

export default function PartnersClient() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <Header />

      <main className="pt-16">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="ds-section border-b border-[var(--border)]">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3">Планирование</p>
            <h1 className="ds-h1 font-playfair mb-4">Всё для поездки на Камчатку</h1>
            <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
              Авиабилеты, отели, трансферы и страховка — партнёрские сервисы, которые мы рекомендуем туристам платформы.
            </p>
          </div>
        </section>

        {/* ── Блоки ────────────────────────────────────────────────────────── */}
        <section className="ds-section">
          <div className="max-w-4xl space-y-0">

            {/* Яндекс Путешествия — полная ширина; убираем border-t первого блока */}
            <div className="[&>section]:border-t-0 [&>section]:pt-0 [&>section]:mt-0">
              <YandexTravelBlock source="partners_page" />
            </div>

            {/* Авиабилеты + Отели */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
              <FlightsBlock />
              <HotelsBlock nights={4} />
            </div>

            {/* Трансферы + Страховка */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
              <TransfersBlock />
              <InsuranceBlock activityTypes={['trekking']} />
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
