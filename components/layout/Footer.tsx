import Link from 'next/link';
import { Mountain } from 'lucide-react';

const FOOTER_SECTIONS = [
  {
    title: 'О платформе',
    links: [
      { href: '/about', label: 'О нас' },
      { href: '/eco', label: 'Экология' },
      { href: '/safety', label: 'Безопасность' },
    ],
  },
  {
    title: 'Туры',
    links: [
      { href: '/tours', label: 'Все туры' },
      { href: '/tours/fishing', label: 'Рыбалка' },
      { href: '/search', label: 'Поиск' },
    ],
  },
  {
    title: 'Операторам',
    links: [
      { href: '/partner/register', label: 'Стать партнёром' },
      { href: '/hub/operator', label: 'Кабинет оператора' },
      { href: '/hub/guide', label: 'Кабинет гида' },
    ],
  },
  {
    title: 'Контакты',
    links: [
      { href: 'tel:+79147822222', label: '+7 914-782-22-22' },
      { href: 'mailto:info@kamchatour.ru', label: 'info@kamchatour.ru' },
      { href: '/legal/terms', label: 'Условия' },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {FOOTER_SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="
                        text-sm text-[var(--text-secondary)]
                        hover:text-[var(--text-primary)]
                        transition-colors duration-200
                      "
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Mountain className="w-4 h-4" />
            <span>Kamchatour Hub {year}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
            <Link href="/legal/privacy" className="hover:text-[var(--text-secondary)] transition-colors">
              Конфиденциальность
            </Link>
            <Link href="/legal/terms" className="hover:text-[var(--text-secondary)] transition-colors">
              Условия
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
