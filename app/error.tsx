'use client';

import Link from 'next/link';

export default function Error({
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
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--danger, #ef4444)', opacity: 0.1 }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: 'var(--danger, #ef4444)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--text-primary, #1a1a2e)' }}
        >
          Произошла ошибка
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-muted, #666)' }}
        >
          Страница столкнулась с проблемой. Попробуйте обновить или вернитесь на
          главную.
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
            Попробовать снова
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-medium text-sm border"
            style={{
              borderColor: 'var(--border, #e5e7eb)',
              color: 'var(--text-secondary, #444)',
            }}
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
