import { Metadata } from 'next';
import { AlertTriangle, Phone, MapPin, Shield } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Безопасность | Kamchatour',
  description: 'Безопасность на Камчатке: SOS, МЧС 112, экстренные контакты, чеклисты для туристов.',
  alternates: { canonical: 'https://kamchatourhub.ru/safety' },
};

export default function SafetyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-[var(--danger)]" />
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Безопасность</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-[var(--radius-lg)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-6 h-6 text-[var(--danger)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">SOS</h2>
          </div>
          <p className="text-[var(--text-secondary)] mb-4">
            При угрозе жизни немедленно звоните в МЧС
          </p>
          <a
            href="tel:112"
            className="w-full flex items-center justify-center gap-3 py-8 text-3xl font-bold bg-[var(--danger)] text-white rounded-2xl shadow-lg hover:bg-red-600 transition-all duration-200 animate-pulse"
          >
            <Phone className="w-8 h-8" />
            112 — МЧС
          </a>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-6 h-6 text-[var(--accent)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Экстренные контакты</h2>
          </div>
          <ul className="space-y-2 text-[var(--text-secondary)]">
            <li>112 — Единый номер экстренных служб</li>
            <li>103 — Скорая помощь</li>
            <li>101 — Пожарная</li>
            <li>+7 914-782-22-22 — Kamchatour Hub</li>
          </ul>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-6 h-6 text-[var(--accent)]" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Правила безопасности на Камчатке</h2>
        </div>
        <ul className="space-y-2 text-[var(--text-secondary)] list-disc list-inside">
          <li>Всегда сообщайте маршрут и сроки похода оператору или МЧС</li>
          <li>Не приближайтесь к медведям ближе 100 метров</li>
          <li>Следите за погодой — она меняется быстро</li>
          <li>Берите запас еды, воды и тёплой одежды</li>
          <li>Не ходите на вулканы без сертифицированного гида</li>
          <li>Держите телефон заряженным, имейте powerbank</li>
        </ul>
      </div>

      <Link
        href="/hub/safety"
        className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors"
      >
        <Shield className="w-4 h-4" />
        Подробнее о безопасности
      </Link>
    </div>
  );
}
