'use client';

import { useEffect, useState } from 'react';

export type HomeMetrics = {
  routesTotal: number;
  verifiedOperators: number;
  activeTours: number;
  openBookings: number;
  activeOperators: number;
  updatedAt: string;
  degraded?: boolean;
};

const FALLBACK_METRICS: HomeMetrics = {
  routesTotal: 1000,
  verifiedOperators: 47,
  activeTours: 120,
  openBookings: 32,
  activeOperators: 19,
  updatedAt: '',
};

let cachedMetrics: HomeMetrics | null = null;
let inFlight: Promise<HomeMetrics> | null = null;

async function loadMetrics(): Promise<HomeMetrics> {
  const response = await fetch('/api/home/metrics', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Не удалось загрузить метрики главной страницы');
  }

  const data = (await response.json()) as Partial<HomeMetrics>;
  return {
    routesTotal: Number(data.routesTotal ?? FALLBACK_METRICS.routesTotal),
    verifiedOperators: Number(data.verifiedOperators ?? FALLBACK_METRICS.verifiedOperators),
    activeTours: Number(data.activeTours ?? FALLBACK_METRICS.activeTours),
    openBookings: Number(data.openBookings ?? FALLBACK_METRICS.openBookings),
    activeOperators: Number(data.activeOperators ?? FALLBACK_METRICS.activeOperators),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    degraded: Boolean(data.degraded),
  };
}

export function useHomeMetrics() {
  const [metrics, setMetrics] = useState<HomeMetrics>(cachedMetrics ?? FALLBACK_METRICS);
  const [loading, setLoading] = useState<boolean>(!cachedMetrics);

  useEffect(() => {
    let mounted = true;

    if (!inFlight) {
      inFlight = loadMetrics()
        .then((data) => {
          cachedMetrics = data;
          return data;
        })
        .catch(() => FALLBACK_METRICS)
        .finally(() => {
          inFlight = null;
        });
    }

    inFlight
      .then((data) => {
        if (!mounted) return;
        setMetrics(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { metrics, loading };
}
