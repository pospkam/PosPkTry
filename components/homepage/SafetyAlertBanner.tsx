'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface SafetyStatus {
  hasAlert: boolean;
  maxSeverity: number;
  activeCount: number;
  topTitle: string | null;
  topType: string | null;
}

const SEVERITY_STYLE: Record<number, { bg: string; border: string; text: string; icon: string }> = {
  1: {
    bg: 'bg-[var(--warning)]/10',
    border: 'border-[var(--warning)]/40',
    text: 'text-[var(--warning)]',
    icon: 'text-[var(--warning)]',
  },
  2: {
    bg: 'bg-[var(--danger)]/10',
    border: 'border-[var(--danger)]/40',
    text: 'text-[var(--danger)]',
    icon: 'text-[var(--danger)]',
  },
  3: {
    bg: 'bg-[var(--danger)]/20',
    border: 'border-[var(--danger)]/60',
    text: 'text-[var(--danger)]',
    icon: 'text-[var(--danger)]',
  },
};

export function SafetyAlertBanner() {
  const [status, setStatus] = useState<SafetyStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/public/safety-status')
      .then(r => r.json())
      .then(d => { if (d.success) setStatus(d.data); })
      .catch(() => {/* silent */});
  }, []);

  if (!status?.hasAlert || dismissed || status.maxSeverity < 1) return null;

  const style = SEVERITY_STYLE[status.maxSeverity] ?? SEVERITY_STYLE[1];
  const Icon = status.maxSeverity >= 2 ? ShieldAlert : AlertTriangle;

  return (
    <div className={`${style.bg} border-b ${style.border} px-4 py-2.5`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${style.icon}`} />
          <p className={`text-sm font-medium ${style.text} truncate`}>
            {status.activeCount > 1
              ? `${status.activeCount} активных алерта: ${status.topTitle ?? 'сейсмическая активность'}`
              : (status.topTitle ?? 'Сейсмическая активность на Камчатке')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/hub/admin/safety"
            className={`text-xs font-medium underline underline-offset-2 ${style.text} hover:opacity-70 transition-opacity`}
          >
            Подробнее
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className={`${style.text} hover:opacity-70 transition-opacity p-0.5`}
            aria-label="Закрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
