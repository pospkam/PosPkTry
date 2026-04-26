'use client';

import { type Region } from '@/lib/geo/regions';
import { estimateTilesMb } from '@/lib/offline/tiles';
import { useOfflineRegion } from '@/lib/offline/useOfflineRegion';

interface RegionCardProps {
  region: Region;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function RegionCard({ region }: RegionCardProps) {
  const { status, progress, regionMeta, error, download, remove } =
    useOfflineRegion(region.id);

  const isDownloading = status === 'fetching-routes' || status === 'caching-tiles';
  const isCached = status === 'cached';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[var(--text-primary)] text-base leading-tight">
              {region.name}
            </h3>
            {/* Status badge */}
            {isCached && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 font-medium shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Скачан
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-medium shrink-0">
                Ошибка
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            {region.shortDescription}
          </p>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
        {isCached && regionMeta ? (
          <>
            {/* ПОСЛЕ скачивания: реальные цифры */}
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {regionMeta.routesCount} маршрутов скачано
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8-4s8 1.79 8 4" />
              </svg>
              {regionMeta.tilesCount} тайлов, ~{estimateTilesMb(region.bbox)} MB
            </span>
            <span>Скачан {formatDate(regionMeta.downloadedAt)}</span>
          </>
        ) : (
          <>
            {/* ДО скачивания: приблизительные оценки */}
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ~{region.estimatedRoutes} маршрутов
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8-4s8 1.79 8 4" />
              </svg>
              {region.estimatedSizeRange}
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      {isDownloading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>
              {status === 'fetching-routes'
                ? 'Загрузка маршрутов...'
                : `Кэширование тайлов... ${progress.percent}%`}
            </span>
            {status === 'caching-tiles' && (
              <span className="text-[var(--text-muted)]">
                {progress.done}/{progress.total}
              </span>
            )}
          </div>
          <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
              style={{
                width: status === 'fetching-routes' ? '5%' : `${progress.percent}%`,
              }}
            />
          </div>
          {progress.failed > 0 && (
            <p className="text-xs text-amber-500">
              {progress.failed} тайлов не удалось скачать (нет сети или лимит запросов)
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Action button */}
      <div className="flex gap-2 mt-auto">
        {!isCached && !isDownloading && (
          <button
            onClick={download}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Скачать
          </button>
        )}

        {isDownloading && (
          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Скачивается...
          </div>
        )}

        {isCached && (
          <>
            <button
              onClick={remove}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/10 active:scale-95 transition-all"
              title="Удалить скачанный регион"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Удалить
            </button>
            <button
              onClick={download}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-tertiary)] active:scale-95 transition-all"
              title="Обновить скачанный регион"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Обновить
            </button>
          </>
        )}

        {status === 'error' && (
          <button
            onClick={download}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-tertiary)] active:scale-95 transition-all"
          >
            Повторить
          </button>
        )}
      </div>
    </div>
  );
}
