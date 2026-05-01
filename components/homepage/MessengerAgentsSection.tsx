'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// Brand SVG icons — встроенные, чтобы не тянуть внешние зависимости.
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path
        d="M5.49 11.64l11.52-4.44c.53-.19 1 .13.83.95l-1.96 9.22c-.14.66-.53.82-1.08.51l-2.99-2.2-1.44 1.39c-.16.16-.3.3-.6.3l.21-3.02 5.5-4.97c.24-.21-.05-.33-.37-.12l-6.8 4.28-2.93-.92c-.64-.2-.65-.64.13-.95z"
        fill="#fff"
      />
    </svg>
  );
}

function MaxIcon({ className }: { className?: string }) {
  // Оранжевый плашка + белая M (фирменный стиль MAX от VK)
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#FF7A00" />
      <path
        d="M6 17V7h2.3l3.7 5.5L15.7 7H18v10h-2.2v-6.6l-3.2 4.8h-1.2L8.2 10.4V17H6z"
        fill="#fff"
      />
    </svg>
  );
}

function WebIcon({ className }: { className?: string }) {
  // Глобус для веба (tourhab accent)
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#0EA5E9" />
      <g stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round">
        <circle cx="12" cy="12" r="7" />
        <path d="M5 12h14" />
        <path d="M12 5c2.6 2.8 2.6 11.2 0 14M12 5c-2.6 2.8-2.6 11.2 0 14" />
      </g>
    </svg>
  );
}

const CHANNELS = [
  { title: 'Telegram', href: 'https://t.me/KuzmichKam_bot?start=homepage', Icon: TelegramIcon },
  { title: 'MAX', href: 'https://max.ru/id4101147649_bot', Icon: MaxIcon },
  { title: 'Веб', href: '/ai-assistant', Icon: WebIcon },
];

export function MessengerAgentsSection() {
  return (
    <section
      id="chat"
      className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] px-4 py-3 md:px-6 md:py-4"
    >
      <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
        AI-консьерж Кузьмич
      </p>
      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map(({ title, href, Icon }) => {
          const content = (
            <>
              <Icon className="h-6 w-6 shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {title}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-muted)] ml-auto shrink-0" />
            </>
          );
          const className =
            'flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors';

          if (href.startsWith('http')) {
            return (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
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
