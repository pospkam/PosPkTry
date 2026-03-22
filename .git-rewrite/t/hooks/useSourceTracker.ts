'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'th_source';

export interface SourceData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing_page?: string;
  timestamp?: string;
}

/**
 * Сохраняет UTM-параметры и referrer при первом визите.
 * First-touch attribution — не перезаписывает существующие данные.
 */
export function useSourceTracker() {
  useEffect(() => {
    try {
      // Не перезаписываем если уже есть (first touch)
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing) return;

      const url = new URL(window.location.href);
      const utmSource = url.searchParams.get('utm_source');
      const utmMedium = url.searchParams.get('utm_medium');
      const utmCampaign = url.searchParams.get('utm_campaign');
      const referrer = document.referrer || undefined;

      // Сохраняем только если есть хоть что-то
      if (utmSource || utmMedium || referrer) {
        const data: SourceData = {
          utm_source: utmSource || undefined,
          utm_medium: utmMedium || undefined,
          utm_campaign: utmCampaign || undefined,
          referrer: referrer || undefined,
          landing_page: window.location.pathname,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // localStorage недоступен
    }
  }, []);
}

/** Читает сохранённые source данные. */
export function getSourceData(): SourceData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SourceData) : null;
  } catch {
    return null;
  }
}
