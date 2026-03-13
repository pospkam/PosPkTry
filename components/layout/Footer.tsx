import Link from 'next/link';
import Image from 'next/image';

const PLATFORM = [
  { label: 'Туры и маршруты', href: '/tours' },
  { label: 'Карта Камчатки', href: '/map' },
  { label: 'Гид-ассистент', href: '/ai-assistant' },
  { label: 'Стать партнёром', href: '/auth/login' },
];

const LEGAL = [
  { label: 'Пользовательское соглашение', href: '/legal/terms' },
  { label: 'Политика конфиденциальности', href: '/legal/privacy' },
  { label: 'Публичная оферта', href: '/legal/offer' },
  { label: 'Условия комиссии', href: '/legal/commission' },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Image
                src="/logo-kamchatka.svg"
                alt="KamchatourHub"
                width={32}
                height={32}
                className="shrink-0"
              />
              <span
                className="text-base font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-outfit)' }}
              >
                KamchatourHub
              </span>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
              Туристическая платформа Камчатки. Туры, трансферы, гиды — всё в одном месте.
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-4">
              support@kamhub.ru
            </p>
          </div>

          {/* Platform links */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Платформа
            </p>
            <ul className="space-y-2.5">
              {PLATFORM.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Правовые документы
            </p>
            <ul className="space-y-2.5">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} ООО «Трей» (ИНН 4100053571). Все права защищены.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            683017, Камчатский край, г. Петропавловск-Камчатский
          </p>
        </div>
      </div>
    </footer>
  );
}
