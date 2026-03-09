'use client';

/**
 * SOSButton — фиксированная кнопка экстренной помощи.
 * Всегда видна поверх контента (z-index 90).
 */
export default function SOSButton() {
  return (
    <a
      href="/safety"
      aria-label="SOS — экстренная помощь"
      style={{
        position: 'fixed',
        bottom: '88px',
        right: '20px',
        zIndex: 90,
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        color: '#fff',
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
