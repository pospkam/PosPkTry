'use client';

import Link from 'next/link';
import { ArrowUpRight, Bot, MessageCircle, Smartphone } from 'lucide-react';

const CHANNELS = [
  {
    title: 'Telegram',
    href: 'https://t.me/KuzmichKam_bot?start=homepage',
    note: 'Быстрый вход в Кузьмича из привычного чата',
    accent: 'var(--ocean)',
    icon: MessageCircle,
  },
  {
    title: 'MAX',
    href: 'https://max.ru/id4101147649_bot',
    note: 'Тот же Кузьмич в MAX без отдельного сценария',
    accent: '#D44A0C',
    icon: Smartphone,
  },
  {
    title: 'Веб-версия',
    href: '/ai-assistant',
    note: 'Полный сценарий Кузьмича с подбором туров, рисков и маршрутов',
    accent: 'var(--ocean)',
    icon: Bot,
  },
];

export function MessengerAgentsSection() {
  return (
    <section className="border-b border-[var(--border)] bg-[var(--bg-card)] px-5 py-10 md:py-12">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[0.9fr_1.1fr] md:gap-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-5 md:p-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Кузьмич везде</p>
          <h2 className="font-playfair text-2xl font-bold leading-tight text-[var(--text-primary)] md:text-4xl">
            Один AI-консьерж в Telegram, MAX и на сайте
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
            Турист начинает диалог там, где ему удобно, а Кузьмич сохраняет единый сценарий подбора.
            Это основной вход в продукт, а не декоративный AI-блок.
          </p>
        </div>

        <div className="grid gap-3">
          {CHANNELS.map(({ title, href, note, accent, icon: Icon }) => {
            const content = (
              <>
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: accent }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{note}</p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]" />
              </>
            );

            const className = 'group flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 transition-colors hover:bg-[var(--bg-hover)]';

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
      </div>
    </section>
  );
}
