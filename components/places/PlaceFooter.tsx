import { ExternalLink, Send } from 'lucide-react';

interface Props {
  sourceUrl: string | null;
  sourceName: string | null;
  updatedAt: string | null;
}

export default function PlaceFooter({ sourceUrl, sourceName, updatedAt }: Props) {
  const updatedStr = updatedAt
    ? new Date(updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <footer className="max-w-3xl mx-auto px-4 pb-12 space-y-3 text-xs text-[var(--text-muted)]">
      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[var(--ocean)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Источник: {sourceName ?? 'ссылка'}
          </a>
        )}
        {updatedStr && (
          <p>Обновлено: {updatedStr}</p>
        )}
        <a
          href="https://t.me/kamchatka_real"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-[var(--ocean)] transition-colors"
        >
          <Send className="w-3 h-3" />
          Был тут? Поделись фото в @kamchatka_real
        </a>
      </div>
    </footer>
  );
}
