'use client';

import Link from 'next/link';
import { ArrowUpRight, MessageCircle, Smartphone, Bot } from 'lucide-react';

const CHANNELS = [
  {
    title: 'Telegram',
    href: 'https://t.me/KuzmichKam_bot?start=homepage',
    note: 'Кузьмич в привычном чате',
    accent: 'var(--ocean)',
    icon: MessageCircle,
  },
  {
    title: 'MAX',
    href: 'https://max.ru/id4101147649_bot',
    note: 'Тот же Кузьмич в MAX',
    accent: '#D44A0C',
    icon: Smartphone,
  },
  {
    title: 'Веб',
    href: '/ai-assistant',
    note: 'Полный сценарий на сайте',
    accent: 'var(--ocean)',
    icon: Bot,
  },
];

export function MessengerAgentsSection() {
  return (
    <section className="border-t border-[var(--border)] bg-[var(--bg-card)] px-5 py-6 md:px-8 md:py-8">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
        AI-консьерж Кузьмич
      </p>
      <div className="grid gap-2">
        {CHANNELS.map(({ title, href, note, accent, icon: Icon }) => {
          const content = (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
                >
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{note}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)]" />
            </>
          );

          const className = 'group flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 transition-colors hover:bg-[var(--bg-hover)]';

          if (href.startsWith('http')) {
            return (
              <a key={title} href={href} target="_blank" rel="noopener noreferrer" className={className}>
                {content}
              </a>
            );
          }

          return (
            <Link key={title} href={href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
