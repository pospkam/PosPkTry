'use client';

import Link from 'next/link';
import { ArrowUpRight, MessageCircle, Smartphone, Bot } from 'lucide-react';

const CHANNELS = [
  {
    title: 'Telegram',
    href: 'https://t.me/KuzmichKam_bot?start=homepage',
    icon: MessageCircle,
    accent: 'var(--ocean)',
  },
  {
    title: 'MAX',
    href: 'https://max.ru/id4101147649_bot',
    icon: Smartphone,
    accent: '#D44A0C',
  },
  {
    title: 'Веб',
    href: '/ai-assistant',
    icon: Bot,
    accent: 'var(--ocean)',
  },
];

export function MessengerAgentsSection() {
  return (
    <section id="chat" className="bg-white shadow-md rounded-lg border border-[var(--border)] mx-4 my-3 md:mx-6 md:my-4 px-4 py-3 md:px-6 md:py-4">
      <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
        AI-консьерж Кузьмич
      </p>
      <div className="flex gap-2">
        {CHANNELS.map(({ title, href, icon: Icon, accent }) => {
          const content = (
            <>
              <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-muted)] ml-auto" />
            </>
          );
          const className = 'flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors flex-1 justify-between';

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
