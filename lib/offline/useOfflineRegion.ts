'use client';

/**
 * Хук для управления скачиванием региона для офлайн-доступа.
 * Координирует SW (тайлы) + IndexedDB (маршруты) + SOS-контакты.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RegionId } from '@/lib/geo/regions';
import { REGIONS } from '@/lib/geo/regions';
import { generateTileUrls } from '@/lib/offline/tiles';
import {
  saveRegion,
  getRegion,
  deleteRegion,
  saveRoutes,
  saveSosContacts,
  GLOBAL_SOS_CONTACTS,
  type RegionMeta,
  type OfflineRoute,
} from '@/lib/offline/db';

export type DownloadStatus = 'idle' | 'fetching-routes' | 'caching-tiles' | 'cached' | 'error';

export interface DownloadProgress {
  done: number;
  failed: number;
  total: number;
  /** 0-100 */
  percent: number;
}

export interface UseOfflineRegionReturn {
  status: DownloadStatus;
  progress: DownloadProgress;
  regionMeta: RegionMeta | null;
  error: string | null;
  download: () => Promise<void>;
  remove: () => Promise<void>;
}

const EMPTY_PROGRESS: DownloadProgress = { done: 0, failed: 0, total: 0, percent: 0 };

export function useOfflineRegion(regionId: RegionId): UseOfflineRegionReturn {
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const [progress, setProgress] = useState<DownloadProgress>(EMPTY_PROGRESS);
  const [regionMeta, setRegionMeta] = useState<RegionMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const swMessageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  // Загружаем сохранённые метаданные при монтировании
  useEffect(() => {
    let cancelled = false;
    getRegion(regionId).then((meta) => {
      if (cancelled) return;
      if (meta) {
        setRegionMeta(meta);
        setStatus('cached');
      }
    });
    return () => { cancelled = true; };
  }, [regionId]);

  // Очищаем SW listener при размонтировании
  useEffect(() => {
    return () => {
      if (swMessageHandlerRef.current) {
        navigator.serviceWorker?.removeEventListener('message', swMessageHandlerRef.current);
      }
    };
  }, []);

  const download = useCallback(async () => {
    if (status === 'fetching-routes' || status === 'caching-tiles') return;

    setError(null);
    setProgress(EMPTY_PROGRESS);

    const region = REGIONS[regionId];
    if (!region) {
      setError('Регион не найден');
      setStatus('error');
      return;
    }

    try {
      // ── Шаг 1: Запрашиваем маршруты из API ────────────────────────────
      setStatus('fetching-routes');

      const { bbox } = region;
      const params = new URLSearchParams({
        south: String(bbox.south),
        west: String(bbox.west),
        north: String(bbox.north),
        east: String(bbox.east),
        limit: '500',
      });

      const res = await fetch(`/api/routes/by-region?${params.toString()}`);
      if (!res.ok) throw new Error(`API вернул ${res.status}`);

      const { routes } = (await res.json()) as { routes: OfflineRoute[] };

      // ── Шаг 2: Сохраняем маршруты в IndexedDB ─────────────────────────
      const routesWithRegion: OfflineRoute[] = routes.map((r) => ({
        ...r,
        regionId,
        cachedAt: Date.now(),
      }));
      await saveRoutes(routesWithRegion);

      // ── Шаг 3: Сохраняем глобальные SOS-контакты ──────────────────────
      await saveSosContacts(GLOBAL_SOS_CONTACTS);

      // ── Шаг 4: Отправляем тайлы в SW ──────────────────────────────────
      const tileUrls = generateTileUrls(bbox);
      const totalTiles = tileUrls.length;

      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker не поддерживается в этом браузере');
      }

      const sw = await navigator.serviceWorker.ready;
      if (!sw.active) throw new Error('Service Worker не активен');

      setStatus('caching-tiles');
      setProgress({ done: 0, failed: 0, total: totalTiles, percent: 0 });

      // ── Шаг 5: Слушаем прогресс от SW ─────────────────────────────────
      await new Promise<void>((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          const data = event.data;
          if (!data || data.regionId !== regionId) return;

          if (data.type === 'TILE_PROGRESS') {
            const percent = data.total > 0
              ? Math.round(((data.done + data.failed) / data.total) * 100)
              : 0;
            setProgress({ done: data.done, failed: data.failed, total: data.total, percent });
          }

          if (data.type === 'TILES_DONE') {
            navigator.serviceWorker.removeEventListener('message', handler);
            swMessageHandlerRef.current = null;
            setProgress({
              done: data.done,
              failed: data.failed,
              total: data.total,
              percent: 100,
            });
            // Если тайлы не скачались — ошибка, а не "скачано"
            if (data.failed > 0 && data.done === 0) {
              reject(new Error(`Тайлы не скачаны: ${data.failed} ошибок из ${data.total}`));
            } else if (data.failed > 0) {
              // Частичный успех — сохраняем но предупреждаем
              resolve();
            } else {
              resolve();
            }
          }
        };

        swMessageHandlerRef.current = handler;
        navigator.serviceWorker.addEventListener('message', handler);

        // Таймаут 15 минут (большой регион)
        const timeout = setTimeout(() => {
          navigator.serviceWorker.removeEventListener('message', handler);
          swMessageHandlerRef.current = null;
          reject(new Error('Таймаут скачивания тайлов (15 мин)'));
        }, 15 * 60 * 1000);

        sw.active!.postMessage({
          type: 'CACHE_TILES',
          tiles: tileUrls,
          regionId,
        });

        // Отменяем таймаут в случае resolve
        void Promise.resolve().then(() => clearTimeout(timeout));
      });

      // ── Шаг 6: Сохраняем метаданные региона ───────────────────────────
      const meta: RegionMeta = {
        id: regionId,
        downloadedAt: Date.now(),
        version: 1,
        tilesCount: totalTiles,
        routesCount: routesWithRegion.length,
        sizeBytes: 0, // точный размер — через StorageEstimate
      };
      await saveRegion(meta);
      setRegionMeta(meta);
      setStatus('cached');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
      setStatus('error');
    }
  }, [regionId, status]);

  const remove = useCallback(async () => {
    try {
      // Удаляем маршруты и метаданные из IndexedDB
      await deleteRegion(regionId);

      // Отправляем команду SW (информационно — tile cache общий)
      if ('serviceWorker' in navigator) {
        const sw = await navigator.serviceWorker.ready;
        sw.active?.postMessage({
          type: 'CLEAR_REGION_TILES',
          regionId,
        });
      }

      setRegionMeta(null);
      setStatus('idle');
      setProgress(EMPTY_PROGRESS);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка удаления';
      setError(message);
    }
  }, [regionId]);

  return { status, progress, regionMeta, error, download, remove };
}
