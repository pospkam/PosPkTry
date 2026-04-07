'use client';

import Link from 'next/link';

export default function RouteDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Ошибка загрузки маршрута
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Не удалось загрузить данные маршрута. Попробуйте снова.
        </p>
        {error.digest && (
          <p className="text-xs mb-4 font-mono" style={{ color: 'var(--text-muted)' }}>
            {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="ds-btn ds-btn-primary">
            Обновить
          </button>
          <Link href="/routes" className="ds-btn ds-btn-secondary">
            Все маршруты
          </Link>
        </div>
      </div>
    </div>
  );
}
