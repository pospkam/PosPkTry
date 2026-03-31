/**
 * AffiliateCard — client component
 * Tracks clicks for revenue analytics
 */

'use client';

import { LucideIcon } from 'lucide-react';

const colorMap: Record<string, string> = {
  ocean: 'text-[var(--ocean)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  accent: 'text-[var(--accent)]',
  danger: 'text-[var(--danger)]',
};

const bgColorMap: Record<string, string> = {
  ocean: 'bg-[var(--ocean)]/10',
  success: 'bg-[var(--success)]/10',
  warning: 'bg-[var(--warning)]/10',
  accent: 'bg-[var(--accent)]/10',
  danger: 'bg-[var(--danger)]/10',
};

interface AffiliateCardProps {
  partnerKey: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
  btnStyle: string;
  href: string;
}

export function AffiliateCard({
  partnerKey,
  icon: Icon,
  title,
  subtitle,
  color,
  btnStyle,
  href,
}: AffiliateCardProps) {
  const handleClick = async () => {
    try {
      await fetch('/api/analytics/affiliate-clicks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner: partnerKey,
          source: 'homepage_banner',
          referrer: typeof window !== 'undefined' ? window.location.href : null,
        }),
      });
    } catch (err) {
      console.error('Failed to track click:', err);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="ds-card rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-[var(--border)]"
    >
      <div className={`w-8 h-8 rounded-md ${bgColorMap[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${colorMap[color]}`} />
      </div>
      <div>
        <div className="font-medium text-sm text-[var(--text-primary)] leading-snug">
          {title}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">
          {subtitle}
        </div>
      </div>
      <div className="mt-auto pt-2">
        <span className={`${btnStyle} text-xs w-full text-center block px-2 py-1.5`}>
          Перейти
        </span>
      </div>
    </a>
  );
}
