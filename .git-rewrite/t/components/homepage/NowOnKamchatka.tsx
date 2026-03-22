'use client';

import React, { useEffect, useState } from 'react';
import { Thermometer, Calendar, Compass, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/homepage/Reveal';

interface NowData {
  temperature: number | null;
  weatherDesc: string;
  seasonNote: string;
  nextDeparture: {
    date: string;
    tourName: string;
    operatorName: string;
    slots: number;
  } | null;
}

export function NowOnKamchatka() {
  const [data, setData] = useState<NowData | null>(null);

  useEffect(() => {
    fetch('/api/public/now')
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .catch(() => {/* silent */});
  }, []);

  if (!data) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="ds-skeleton h-24 rounded-lg" />
        </div>
      </section>
    );
  }

  const nextDate = data.nextDeparture
    ? new Date(data.nextDeparture.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : null;

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <div className="bg-[var(--kh-surface)] border border-[var(--kh-border)] rounded-lg p-5 md:p-6">
            <h2
              className="font-playfair text-lg md:text-xl font-bold text-[var(--kh-text)] mb-4"
            >
              Сейчас на Камчатке
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Температура */}
              {data.temperature != null && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                    <Thermometer className="w-4.5 h-4.5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[var(--kh-text)]">
                      {data.temperature > 0 ? '+' : ''}{Math.round(data.temperature)}&deg;C
                    </p>
                    <p className="text-xs text-[var(--kh-text-dim)]">
                      Петропавловск{data.weatherDesc ? `, ${data.weatherDesc}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Сезон */}
              {data.seasonNote && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--success)]/10 flex items-center justify-center flex-shrink-0">
                    <Compass className="w-4.5 h-4.5 text-[var(--success)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--kh-text)]">Сезон</p>
                    <p className="text-xs text-[var(--kh-text-dim)] leading-relaxed">{data.seasonNote}</p>
                  </div>
                </div>
              )}

              {/* Ближайший выезд */}
              {data.nextDeparture && nextDate && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--ocean)]/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4.5 h-4.5 text-[var(--ocean)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--kh-text)]">
                      {nextDate}
                    </p>
                    <p className="text-xs text-[var(--kh-text-dim)]">
                      {data.nextDeparture.operatorName}
                    </p>
                    <a
                      href="/routes"
                      className="inline-flex items-center gap-1 text-xs text-[var(--ocean)] hover:underline mt-0.5"
                    >
                      Смотреть <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
