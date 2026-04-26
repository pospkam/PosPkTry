import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Нет соединения — KamchatourHub',
  robots: 'noindex, nofollow',
};

export default function OfflinePage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        {/* Logo placeholder — будет заменён на иконку PWA */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
          <svg className="w-12 h-12 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h3A2.5 2.5 0 0016 5.5V3.935m3 8.965a2.5 2.5 0 01-4 0m-5.055 3.035a2.5 2.5 0 01-4 0M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
        </div>

        <h1 className="font-playfair text-3xl font-bold mb-3 text-[var(--text-primary)]">
          Нет соединения
        </h1>

        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
          Связь пропала, но скачанные регионы и маршруты доступны.
          Откройте главную чтобы продолжить.
        </p>

        <Link
          href="/"
          className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-medium text-sm transition-colors"
        >
          На главную
        </Link>

        <p className="text-xs text-[var(--text-muted)] mt-6">
          KamchatourHub — Камчатка в кармане
        </p>
      </div>
    </main>
  );
}
