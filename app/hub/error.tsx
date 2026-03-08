'use client';

import Link from 'next/link';

export default function HubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-primary, #f8f9fa)' }}
    >
      <div className="text-center max-w-md">
        <h1
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--text-primary, #1a1a2e)' }}
        >
          Ошибка в личном кабинете
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-muted, #666)' }}
        >
          Попробуйте обновить страницу или вернитесь в личный кабинет.
        </p>

        {error.digest && (
          <p
            className="text-xs mb-4 font-mono"
            style={{ color: 'var(--text-muted, #999)' }}
          >
            {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl font-medium text-sm text-white"
            style={{ backgroundColor: 'var(--accent, #00D4FF)' }}
          >
            Обновить
          </button>
          <Link
            href="/profile"
            className="px-6 py-3 rounded-xl font-medium text-sm border"
            style={{
              borderColor: 'var(--border, #e5e7eb)',
              color: 'var(--text-secondary, #444)',
            }}
          >
            В личный кабинет
          </Link>
        </div>
      </div>
    </div>
  );
}
