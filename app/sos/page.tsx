import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SOS — Экстренные номера | TourHab',
  description: 'Экстренные номера для Камчатки. Звонки работают без интернета.',
  robots: { index: true, follow: true },
}

// Захардкоженные номера — работают ВСЕГДА, без зависимостей
const SOS_CONTACTS = [
  { name: 'Единый номер экстренных служб', phone: '112', type: 'МЧС', primary: true },
  { name: 'Скорая медицинская помощь', phone: '103', type: 'Медицина' },
  { name: 'Полиция', phone: '102', type: 'Правоохранительные' },
  { name: 'МЧС Камчатский край', phone: '+7 (4152) 23-53-62', type: 'МЧС' },
  { name: 'ПСО «Камчатка» (ПКГО)', phone: '+7 (4152) 41-27-30', type: 'Спасатели' },
]

export default function SosPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Шапка */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(239,68,68,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 800,
          letterSpacing: '0.05em',
          animation: 'sos-pulse 2s ease-out infinite',
        }}>
          SOS
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Экстренные номера</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Звонки работают без интернета
          </p>
        </div>
      </div>

      {/* Номера */}
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {SOS_CONTACTS.map((c) => (
          <a
            key={c.phone}
            href={`tel:${c.phone.replace(/\s/g, '')}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: c.primary ? '16px' : '14px',
              borderRadius: '14px',
              background: c.primary ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.05)',
              border: c.primary ? '1px solid rgba(220,38,38,0.4)' : '1px solid rgba(255,255,255,0.1)',
              textDecoration: 'none',
              color: '#fff',
              transition: 'background 0.15s',
            }}
          >
            {/* Иконка телефона */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: c.primary ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.primary ? '#f87171' : 'rgba(255,255,255,0.6)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: c.primary ? '16px' : '14px',
                fontWeight: 600,
                marginBottom: '2px',
              }}>
                {c.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {c.type}
              </div>
            </div>

            <div style={{
              fontSize: c.primary ? '20px' : '16px',
              fontWeight: 700,
              fontFamily: 'monospace',
              flexShrink: 0,
              color: c.primary ? '#f87171' : '#fff',
            }}>
              {c.phone}
            </div>
          </a>
        ))}
      </div>

      {/* Подсказка */}
      <div style={{
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <p style={{ margin: '0 0 4px' }}>
          📍 Ваши координаты: <span id="coords">определяются...</span>
        </p>
        <p style={{ margin: 0 }}>
          Сообщите их при звонке в спасательную службу
        </p>
      </div>

      {/* CSS анимация */}
      <style>{`
        @keyframes sos-pulse {
          0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.6); }
          70% { box-shadow: 0 0 0 12px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
        a:active {
          background: rgba(255,255,255,0.12) !important;
        }
      `}</style>

      {/* GPS координаты — работают без интернета */}
      <script dangerouslySetInnerHTML={{ __html: `
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function(pos) {
              document.getElementById('coords').textContent =
                pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4);
            },
            function() {
              document.getElementById('coords').textContent = 'недоступны';
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      `}} />
    </div>
  )
}
