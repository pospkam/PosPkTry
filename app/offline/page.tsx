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
        {/* Камчатка — силуэт как иконка оффлайн-режима */}
        <div className="w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          <img
            src="/icons/kamchatka-silhouette.jpg"
            alt="Камчатка"
            className="w-full h-full object-contain opacity-80"
            loading="eager"
          />
        </div>

        <h1 className="font-playfair text-3xl font-bold mb-3 text-[var(--text-primary)]">
          Нет соединения
        </h1>

        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
          Связь пропала, но скачанные регионы и маршруты доступны.
          Откройте главную чтобы продолжить.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/safety/offline"
            className="inline-block px-6 py-3 rounded-full font-semibold text-sm transition-colors text-white"
            style={{ background: 'var(--danger)' }}
          >
            Инструкции выживания
          </Link>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-full font-medium text-sm transition-colors"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            На главную
          </Link>
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-6">
          KamchatourHub — Камчатка в кармане
        </p>
      </div>
    </main>
  );
}
