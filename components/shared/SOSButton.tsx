'use client';

/**
 * SOSButton — фиксированная кнопка экстренной помощи.
 * Всегда видна поверх контента (z-index 90).
 */
export default function SOSButton() {
  return (
    <a
      href="/hub/safety"
      aria-label="SOS — экстренная помощь"
      style={{
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        left: '16px',
        zIndex: 88,
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, var(--danger) 0%, var(--danger) 100%)`,
        color: 'var(--bg-card)',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.05em',
        textDecoration: 'none',
        animation: 'kh-sos-pulse 2s ease-out infinite',
        boxShadow: '0 4px 16px rgba(220,38,38,0.5)',
        userSelect: 'none',
      }}
    >
      SOS
    </a>
  );
}
