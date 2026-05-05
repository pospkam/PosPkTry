import Link from 'next/link';
import Image from 'next/image';
import { Send } from 'lucide-react';

const PLATFORM = [
  { label: 'Туры', href: '/marketplace' },
  { label: 'Камчатская рыбалка', href: '/hub/fishing' },
  { label: 'Маршруты', href: '/routes' },
  { label: 'Карта Камчатки', href: '/map' },
  { label: 'Планирование поездки', href: '/partners' },
  { label: 'Партнёры', href: '/operators' },
  { label: 'Стать партнёром', href: '/for-operators' },
  { label: 'Помощь туристам', href: '/help/tourists' },
  { label: 'Помощь операторам', href: '/help/operators' },
];

const LEGAL = [
  { label: 'Пользовательское соглашение', href: '/legal/terms' },
  { label: 'Политика конфиденциальности', href: '/legal/privacy' },
  { label: 'Публичная оферта', href: '/legal/offer' },
  { label: 'Условия комиссии', href: '/legal/commission' },
  { label: 'Агентский договор', href: '/legal/agent-agreement' },
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
              support@tourhab.ru
            </p>
<div className="flex flex-col gap-2 mt-3">
              <a
                href="https://t.me/kamchatourhub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--ocean)] hover:underline transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Telegram-канал
              </a>
              <a
                href="https://max.ru/id4101147649_biz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--ocean)] hover:underline transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Канал в MAX
              </a>
            </div>
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
            © {new Date().getFullYear()} ООО «ПОС-СЕРВИС» (ИНН 4101147649). Все права защищены.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/sos" className="text-xs text-red-500 hover:text-red-400 font-semibold transition-colors flex items-center gap-1">
              <span>🆘</span> SOS
            </Link>
            <p className="text-xs text-[var(--text-muted)]">
              683024, Камчатский край, г. Петропавловск-Камчатский
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
