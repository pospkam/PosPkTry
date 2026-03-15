'use client';

/**
 * hooks/useInterestTracker.ts
 *
 * Пассивно отслеживает интересы туриста по его поведению на сайте.
 * Хранит профиль в localStorage (анонимно, без сервера).
 *
 * Сигналы:
 *   - hover ≥ 2 сек на категории → +1 балл
 *   - клик на категорию          → +3 балла
 *   - просмотр страницы маршрута → +2 балла
 *
 * Использование:
 *   const { trackClick, trackHoverStart } = useInterestTracker();
 *
 * Для промпта помощника (без хука, в любом месте):
 *   import { getInterestContext } from '@/hooks/useInterestTracker';
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Константы ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'th_interests';
const HOVER_DELAY_MS = 2000;
const POINTS_CLICK = 3;
const POINTS_HOVER = 1;
const POINTS_ROUTE_VIEW = 2;
const MAX_AGE_DAYS = 30;
const MAX_VIEWED_ROUTES = 20;

// ── Метки для промпта ─────────────────────────────────────────────────────────

const SLUG_LABELS: Record<string, string> = {
  vulkani:              'вулканы',
  geyzery:              'гейзеры',
  rybalka:              'рыбалка',
  termalnye_istochniki: 'термальные источники',
  medvedi:              'медведи',
  morskie_progulki:     'морские прогулки',
  vertoletnye_tury:     'вертолётные туры',
  trekking:             'треккинг',
  snegohod:             'снегоходы',
  dzhip:                'джип-туры',
  lakes:                'озёра',
  mountains:            'горы',
  rivers:               'реки',
  eco:                  'эко-туры',
};

// ── Типы ──────────────────────────────────────────────────────────────────────

interface InterestProfile {
  scores: Record<string, number>;
  viewedRoutes: string[];
  updatedAt: number;
}

export interface InterestTracker {
  /** Вызвать при клике на категорию */
  trackClick: (slug: string) => void;
  /** Вызвать при mouseenter — возвращает cleanup для mouseleave */
  trackHoverStart: (slug: string) => () => void;
  /** Вызвать при просмотре страницы маршрута */
  trackRouteView: (routeId: string, category: string) => void;
  /** Топ-3 категории по баллам */
  topInterests: string[];
}

// ── Утилиты localStorage ──────────────────────────────────────────────────────

function emptyProfile(): InterestProfile {
  return { scores: {}, viewedRoutes: [], updatedAt: Date.now() };
}

function loadProfile(): InterestProfile {
  if (typeof window === 'undefined') return emptyProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile();
    const p = JSON.parse(raw) as InterestProfile;
    const ageMs = Date.now() - (p.updatedAt ?? 0);
    if (ageMs > MAX_AGE_DAYS * 86_400_000) return emptyProfile();
    return p;
  } catch {
    return emptyProfile();
  }
}

function saveProfile(p: InterestProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // localStorage недоступен — silent
  }
}

// ── Standalone функция (без хука) ─────────────────────────────────────────────

/**
 * Возвращает строку для промпта помощника.
 * Вызывать только на клиенте (читает localStorage).
 *
 * Пример: "Турист интересовался: рыбалка, вулканы."
 */
export function getInterestContext(): string {
  const profile = loadProfile();
  const sorted = Object.entries(profile.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .filter(([, score]) => score > 0);

  if (!sorted.length) return '';

  const labels = sorted
    .map(([slug]) => SLUG_LABELS[slug] ?? slug)
    .join(', ');

  return `Турист просматривал: ${labels}.`;
}

// ── Хук ───────────────────────────────────────────────────────────────────────

export function useInterestTracker(): InterestTracker {
  const [profile, setProfile] = useState<InterestProfile>(emptyProfile);

  // Загружаем профиль из localStorage после гидрации
  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  // Ref для хранения cleanup-функций hover-таймеров по slug
  const hoverCleanups = useRef<Map<string, () => void>>(new Map());

  const addScore = useCallback((slug: string, points: number) => {
    setProfile(prev => {
      const updated: InterestProfile = {
        scores: {
          ...prev.scores,
          [slug]: (prev.scores[slug] ?? 0) + points,
        },
        viewedRoutes: prev.viewedRoutes,
        updatedAt: Date.now(),
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const trackClick = useCallback((slug: string) => {
    addScore(slug, POINTS_CLICK);
  }, [addScore]);

  const trackHoverStart = useCallback((slug: string): (() => void) => {
    const timer = setTimeout(() => {
      addScore(slug, POINTS_HOVER);
    }, HOVER_DELAY_MS);
    const cleanup = () => clearTimeout(timer);
    hoverCleanups.current.set(slug, cleanup);
    return () => {
      cleanup();
      hoverCleanups.current.delete(slug);
    };
  }, [addScore]);

  const trackRouteView = useCallback((routeId: string, category: string) => {
    setProfile(prev => {
      const slug = category.toLowerCase().replace(/[\s-]+/g, '_');
      const updated: InterestProfile = {
        scores: {
          ...prev.scores,
          [slug]: (prev.scores[slug] ?? 0) + POINTS_ROUTE_VIEW,
        },
        viewedRoutes: prev.viewedRoutes.includes(routeId)
          ? prev.viewedRoutes
          : [...prev.viewedRoutes.slice(-(MAX_VIEWED_ROUTES - 1)), routeId],
        updatedAt: Date.now(),
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const topInterests = Object.entries(profile.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([slug]) => slug);

  // Cleanup всех таймеров при размонтировании
  useEffect(() => {
    const cleanups = hoverCleanups.current;
    return () => {
      cleanups.forEach(fn => fn());
    };
  }, []);

  return { trackClick, trackHoverStart, trackRouteView, topInterests };
}
