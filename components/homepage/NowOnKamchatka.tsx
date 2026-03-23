'use client';

import React, { useEffect, useState } from 'react';
import { Thermometer, Calendar, ArrowRight, Radio } from 'lucide-react';

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

  const nextDate = data?.nextDeparture
    ? new Date(data.nextDeparture.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="bg-[var(--kh-surface)] border-b border-[var(--kh-border)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4 md:gap-8 overflow-x-auto scrollbar-hide">

        {/* Live индикатор */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Radio className="w-3.5 h-3.5 text-[var(--success)]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--kh-text-dim)]">
            Сейчас
          </span>
        </div>

        {/* Разделитель */}
        <div className="h-4 w-px bg-[var(--kh-border)] flex-shrink-0" />

        {/* Температура */}
        {data?.temperature != null && (
          <>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Thermometer className="w-3.5 h-3.5 text-[var(--kh-text-dim)]" />
              <span className="text-sm font-semibold text-[var(--kh-text)]">
                {data.temperature > 0 ? '+' : ''}{Math.round(data.temperature)}&deg;
              </span>
              {data.weatherDesc && (
                <span className="text-xs text-[var(--kh-text-dim)] hidden sm:inline">
                  {data.weatherDesc}
                </span>
              )}
            </div>
            <div className="h-4 w-px bg-[var(--kh-border)] flex-shrink-0" />
          </>
        )}

        {/* Сезон */}
        {data?.seasonNote && (
          <>
            <p className="text-xs text-[var(--kh-text-dim)] flex-shrink-0 max-w-[180px] truncate hidden md:block">
              {data.seasonNote}
            </p>
            <div className="h-4 w-px bg-[var(--kh-border)] flex-shrink-0 hidden md:block" />
          </>
        )}

        {/* Ближайший выезд */}
        {data?.nextDeparture && nextDate && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[var(--kh-accent2)]" />
            <span className="text-xs text-[var(--kh-text)]">
              <span className="font-semibold">{nextDate}</span>
              <span className="text-[var(--kh-text-dim)] hidden sm:inline">
                {' '}· {data.nextDeparture.operatorName}
              </span>
            </span>
          </div>
        )}

        {/* Spacer + ссылка */}
        <div className="flex-1" />
        <a
          href="/routes"
          className="flex items-center gap-1 text-[11px] text-[var(--kh-accent2)] hover:underline flex-shrink-0"
        >
          Все маршруты <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
