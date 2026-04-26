'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { REGIONS_LIST } from '@/lib/geo/regions';
import { getStorageEstimate, listRegions, type RegionMeta } from '@/lib/offline/db';

// RegionCard использует IndexedDB — только client-side
const RegionCard = dynamic(() => import('@/components/Offline/RegionCard'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 h-40 animate-pulse" />
  ),
});

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface StorageInfo {
  usage?: number;
  quota?: number;
  usagePercent?: number;
}

export default function OfflineManagePage() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [cachedRegionIds, setCachedRegionIds] = useState<Set<string>>(new Set());
  const [swSupported, setSwSupported] = useState(true);

  // Загружаем состояние хранилища и скачанных регионов
  useEffect(() => {
    // Проверяем SW
    if (!('serviceWorker' in navigator)) {
      setSwSupported(false);
    }

    // Storage estimate
    getStorageEstimate().then((info) => {
      if (info) setStorageInfo(info);
    });

    // Список скачанных регионов
    listRegions().then((metas: RegionMeta[]) => {
      setCachedRegionIds(new Set(metas.map((m) => m.id)));
    });
  }, []);

  const cachedCount = cachedRegionIds.size;
  const totalRegions = REGIONS_LIST.length;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-[var(--text-primary)] text-lg leading-tight">
                Офлайн-карты
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Скачайте регион перед поездкой — карта и маршруты без интернета
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* SW warning */}
        {!swSupported && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            Ваш браузер не поддерживает офлайн-режим. Для скачивания карт используйте Chrome, Safari 16+ или Firefox.
          </div>
        )}

        {/* Storage overview */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Хранилище устройства</h2>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">
              Скачано регионов: <strong className="text-[var(--text-primary)]">{cachedCount}</strong> из {totalRegions}
            </span>
            {storageInfo?.usage != null && storageInfo?.quota != null && (
              <span className="text-[var(--text-secondary)]">
                {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
              </span>
            )}
          </div>

          {storageInfo?.usagePercent != null && (
            <div className="space-y-1">
              <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    storageInfo.usagePercent > 80
                      ? 'bg-red-500'
                      : storageInfo.usagePercent > 60
                      ? 'bg-amber-500'
                      : 'bg-[var(--accent)]'
                  }`}
                  style={{ width: `${storageInfo.usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {storageInfo.usagePercent}% использовано
              </p>
            </div>
          )}

          {storageInfo == null && (
            <p className="text-xs text-[var(--text-muted)]">
              Информация о хранилище недоступна в этом браузере
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-sm space-y-1">
          <p className="font-medium text-[var(--accent)]">Как это работает</p>
          <ul className="text-[var(--text-secondary)] space-y-0.5 text-xs leading-relaxed list-disc list-inside">
            <li>Тайлы карты (zoom 7–12) кэшируются в Service Worker</li>
            <li>Маршруты и точки сохраняются в IndexedDB на устройстве</li>
            <li>Один регион занимает ~3–45 MB в зависимости от площади</li>
            <li>После скачивания карта работает без интернета</li>
          </ul>
        </section>

        {/* Regions grid */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Регионы Камчатки
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {REGIONS_LIST.map((region) => (
              <RegionCard key={region.id} region={region} />
            ))}
          </div>
        </section>

        {/* Footer note */}
        <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
          Тайлы карт: OpenTopoMap (CC-BY-SA). Карты актуальны на момент скачивания.
          Рекомендуем обновлять перед каждой поездкой.
        </p>
      </div>
    </main>
  );
}
