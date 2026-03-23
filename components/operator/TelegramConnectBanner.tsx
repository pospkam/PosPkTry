'use client';

import { useEffect, useState } from 'react';
import { Send, X, ExternalLink } from 'lucide-react';

interface TgStatus {
  linked: boolean;
  link?: string;
}

/**
 * Баннер «Подключи Telegram» — показывается пока оператор не подключил бот.
 * После подключения или ручного закрытия исчезает.
 */
export function OperatorTelegramBanner() {
  const [status, setStatus]     = useState<TgStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/telegram/connect')
      .then(r => r.json() as Promise<TgStatus>)
      .then(d => setStatus(d))
      .catch(() => {});
  }, []);

  if (!status || status.linked || dismissed) return null;

  return (
    <div className="mx-5 mt-5 flex items-center gap-3 rounded-lg border border-[var(--ocean)]/30 bg-[var(--ocean)]/5 px-4 py-3">
      <Send className="w-4 h-4 text-[var(--ocean)] shrink-0" />
      <p className="flex-1 text-sm text-[var(--text-secondary)]">
        Подключи Telegram — получай новые бронирования{' '}
        <span className="text-[var(--text-primary)] font-medium">прямо в бот</span> без обновления страницы.
      </p>
      {status.link && (
        <a
          href={status.link}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ocean)] hover:opacity-80 transition-opacity"
        >
          Подключить
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        aria-label="Закрыть"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
