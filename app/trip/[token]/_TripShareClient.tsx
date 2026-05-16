'use client';

import { useState } from 'react';
import { Copy, Check, MapPin, Calendar, Share2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface DayPlan {
  day: number;
  zone: string;
  title: string;
  activityType: string;
  priceFrom: number;
  priceTo: number;
  coords: [number, number];
  defaultTransport: string;
}

interface Trip {
  id: string;
  title: string;
  arrival_date: string | null;
  departure_date: string | null;
  places: string[];
  activities: string[];
  days: DayPlan[];
  transport_by_day: Record<string, string>;
}

const ZONE_LABELS: Record<string, string> = {
  avachinsky: 'Авачинская',
  western: 'Мильковская',
  eastern: 'Карагинская',
  northern: 'Тигильская',
};

const ZONE_COLORS: Record<string, string> = {
  avachinsky: 'var(--accent)',
  eastern: 'var(--ocean)',
  northern: 'var(--success)',
  western: '#8B5CF6',
};

const TRANSPORT_LABELS: Record<string, string> = {
  walking: 'Пешком',
  jeep: 'Джип',
  helicopter: 'Вертолёт',
  boat: 'Катер',
};

function formatPrice(from: number, to: number): string {
  if (!from && !to) return '';
  if (from === to) return `${from.toLocaleString('ru')} ₽`;
  return `${from.toLocaleString('ru')} – ${to.toLocaleString('ru')} ₽`;
}

export function TripShareClient({ trip, token }: { trip: Trip; token: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://tourhab.ru/trip/${token}`;
  const shareText = `${trip.title} — маршрут по Камчатке на ${trip.days.length} дней`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const dateRange = trip.arrival_date && trip.departure_date
    ? `${trip.arrival_date} – ${trip.departure_date}` : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg" style={{ color: 'var(--accent)' }}>KH</Link>
          <Link href="/planner" className="ds-btn ds-btn-primary text-sm px-4 py-2">
            Создать свой маршрут
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-playfair text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {trip.title}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {dateRange && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />{dateRange}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {trip.days.length} {trip.days.length === 1 ? 'день' : trip.days.length < 5 ? 'дня' : 'дней'}
            </span>
          </div>
        </div>

        <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            <Share2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Поделиться маршрутом
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              {copied ? <Check className="w-4 h-4" style={{ color: 'var(--success)' }} /> : <Copy className="w-4 h-4" />}
              {copied ? 'Скопировано' : 'Копировать ссылку'}
            </button>
            <a href={tgUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium"
              style={{ background: '#2AABEE22', color: '#2AABEE', border: '1px solid #2AABEE44' }}>
              <ExternalLink className="w-4 h-4" />Telegram
            </a>
            <a href="https://max.ru/id4101147649_bot" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium"
              style={{ background: '#FF6B0022', color: 'var(--accent)', border: '1px solid var(--accent)44' }}>
              <ExternalLink className="w-4 h-4" />MAX
            </a>
          </div>
        </div>

        <div className="space-y-3">
          {trip.days.map((day) => {
            const transport = trip.transport_by_day?.[String(day.day)] || day.defaultTransport;
            const zoneColor = ZONE_COLORS[day.zone] || 'var(--text-secondary)';
            const price = formatPrice(day.priceFrom, day.priceTo);
            return (
              <div key={day.day} className="rounded-lg p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-none w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: zoneColor }}>
                      {day.day}
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                        {day.title}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="px-2 py-0.5 rounded-full"
                          style={{ background: `${zoneColor}20`, color: zoneColor }}>
                          {ZONE_LABELS[day.zone] || day.zone}
                        </span>
                        {transport && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)' }}>
                            {TRANSPORT_LABELS[transport] || transport}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {price && (
                    <div className="text-xs font-medium flex-none" style={{ color: 'var(--text-secondary)' }}>
                      {price}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg p-6 text-center space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-playfair text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Хочешь свой маршрут?
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            AI-планировщик подберёт маршрут по Камчатке под твои даты и интересы
          </p>
          <Link href="/planner" className="ds-btn ds-btn-primary inline-flex px-6 py-3">
            Создать бесплатно
          </Link>
        </div>
      </div>
    </div>
  );
}
