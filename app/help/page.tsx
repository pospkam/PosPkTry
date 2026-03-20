import type { Metadata } from 'next';
import Link from 'next/link';
import { Package, Map, Users, ArrowRight, MessageSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Центр помощи — TourHab Камчатка',
  description: 'Инструкции для туристов и операторов платформы TourHab',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h1
            className="text-4xl font-bold text-[var(--text-primary)] mb-3"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Центр помощи
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Выберите раздел, который вам нужен
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/help/tourists"
            className="ds-card p-7 hover:bg-[var(--bg-hover)] transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--ocean)] flex items-center justify-center mb-4">
              <Map size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--ocean)] transition-colors">
              Туристам
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Как найти тур, забронировать, оплатить и подготовиться к путешествию на Камчатку.
            </p>
            <div className="flex items-center gap-1 text-[var(--ocean)] text-sm font-medium">
              Открыть <ArrowRight size={16} />
            </div>
          </Link>

          <Link
            href="/help/operators"
            className="ds-card p-7 hover:bg-[var(--bg-hover)] transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-4">
              <Package size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition-colors">
              Операторам
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Как разместить туры, принимать бронирования, настроить выплаты и выйти на OTA.
            </p>
            <div className="flex items-center gap-1 text-[var(--accent)] text-sm font-medium">
              Открыть <ArrowRight size={16} />
            </div>
          </Link>
        </div>

        <div className="mt-8 ds-card p-5 flex items-center gap-4">
          <MessageSquare size={24} className="text-[var(--text-secondary)] flex-shrink-0" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">Не нашли ответ?</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Напишите нам на{' '}
              <a href="mailto:support@tourhab.ru" className="text-[var(--ocean)] hover:underline">
                support@tourhab.ru
              </a>{' '}
              или в Telegram{' '}
              <span className="text-[var(--ocean)]">@tourhab_support</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
