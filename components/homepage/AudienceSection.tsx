'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Briefcase, Check } from 'lucide-react';
import { Reveal } from '@/components/homepage/Reveal';

const TOURIST_FEATURES = [
  '260+ маршрутов с описаниями и картой',
  'Онлайн-бронирование у проверенных операторов',
  'SOS-система с геолокацией 24/7',
  'AI-ассистент для подбора тура',
];

const BUSINESS_FEATURES = [
  'Личный кабинет оператора с аналитикой',
  'Управление турами, расписанием, гидами',
  'Агентская программа с комиссией',
  'Трансферы и размещение в одной экосистеме',
];

export function AudienceSection() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--kh-text)] text-center mb-12">
            Для каждого свой маршрут
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Tourist */}
          <Reveal delay={1}>
            <div className="bg-[var(--kh-surface)] border border-[var(--kh-border)] rounded-lg p-6 md:p-8 h-full flex flex-col">
              <div className="w-14 h-14 rounded-lg bg-[var(--kh-accent)]/10 flex items-center justify-center mb-6">
                <Compass className="w-7 h-7 text-[var(--kh-accent)]" />
              </div>
              <h3 className="font-playfair text-xl md:text-2xl font-bold text-[var(--kh-text)] mb-4">
                Для путешественников
              </h3>
              <ul className="space-y-3 flex-1">
                {TOURIST_FEATURES.map(feature => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[var(--kh-text-dim)]">
                    <Check className="w-4 h-4 text-[var(--kh-accent)] shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/tours"
                className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-[var(--kh-accent)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Найти тур
              </Link>
            </div>
          </Reveal>

          {/* Business */}
          <Reveal delay={2}>
            <div className="bg-[var(--kh-surface)] border border-[var(--kh-border)] rounded-lg p-6 md:p-8 h-full flex flex-col">
              <div className="w-14 h-14 rounded-lg bg-[var(--kh-accent2)]/10 flex items-center justify-center mb-6">
                <Briefcase className="w-7 h-7 text-[var(--kh-accent2)]" />
              </div>
              <h3 className="font-playfair text-xl md:text-2xl font-bold text-[var(--kh-text)] mb-4">
                Для бизнеса
              </h3>
              <ul className="space-y-3 flex-1">
                {BUSINESS_FEATURES.map(feature => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[var(--kh-text-dim)]">
                    <Check className="w-4 h-4 text-[var(--kh-accent2)] shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/login"
                className="mt-6 inline-flex items-center justify-center px-6 py-3 border border-[var(--kh-border)] text-[var(--kh-text)] text-sm font-semibold rounded-lg hover:bg-[var(--kh-surface2)] transition-colors"
              >
                Стать партнёром
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
