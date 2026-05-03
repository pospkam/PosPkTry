import { Phone } from 'lucide-react';

export default function PlaceSOS() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-between gap-2 px-4"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.10)',
        paddingTop: '10px',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide shrink-0"
        style={{ color: 'var(--danger)', fontFamily: 'var(--font-outfit)' }}
        aria-hidden="true"
      >
        SOS
      </span>

      <a
        href="tel:112"
        aria-label="Экстренный вызов 112"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-opacity active:opacity-70 shrink-0"
        style={{ background: 'var(--danger)', color: '#fff' }}
      >
        <Phone className="w-3.5 h-3.5" aria-hidden="true" />
        112
      </a>

      <a
        href="tel:+74152411111"
        aria-label="МЧС Камчатки, номер +7-4152-41-11-11"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity active:opacity-70 shrink-0"
        style={{
          background: 'var(--bg-hover)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        <Phone className="w-3 h-3 shrink-0" style={{ color: 'var(--danger)' }} aria-hidden="true" />
        МЧС Камчатки
      </a>

      <span
        className="text-xs text-right leading-tight shrink-0"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Работает без интернета"
      >
        Без<br />связи
      </span>
    </div>
  );
}
