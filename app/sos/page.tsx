'use client';

import { useState, useEffect } from 'react';
import { MapPin, Phone, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

type SendStatus = 'idle' | 'locating' | 'sending' | 'sent' | 'error';

// Захардкоженные номера — работают ВСЕГДА, без зависимостей
const SOS_CONTACTS = [
  { name: 'Единый номер экстренных служб', phone: '112', type: 'МЧС', primary: true },
  { name: 'Скорая медицинская помощь', phone: '103', type: 'Медицина' },
  { name: 'Полиция', phone: '102', type: 'Правоохранительные' },
  { name: 'МЧС Камчатский край', phone: '+7 (4152) 23-53-62', type: 'МЧС' },
  { name: 'ПСО «Камчатка» (ПКГО)', phone: '+7 (4152) 41-27-30', type: 'Спасатели' },
];

export default function SosPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsLoading, setCoordsLoading] = useState(true);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Геолокация при загрузке
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setCoordsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCoordsLoading(false);
      },
      () => setCoordsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSendSos = async () => {
    if (sendStatus === 'sending' || sendStatus === 'sent') return;
    setSendStatus('locating');

    let position: GeolocationPosition | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          });
        });
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      } catch { /* координаты недоступны — отправляем без них */ }
    }

    setSendStatus('sending');
    try {
      const res = await fetch('/api/safety/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: position?.coords.latitude ?? null,
          lng: position?.coords.longitude ?? null,
          accuracy: position?.coords.accuracy ?? null,
          tourist_name: name.trim() || undefined,
          tourist_phone: phone.trim() || undefined,
        }),
      });
      if (res.status === 429) {
        setSendStatus('error');
        return;
      }
      setSendStatus('sent');
    } catch {
      setSendStatus('error');
    }
  };

  const coordsLabel = coords
    ? `${coords.lat.toFixed(5)}°N, ${coords.lng.toFixed(5)}°E`
    : coordsLoading ? 'Определяем...' : 'Недоступны';

  const smsBody = coords
    ? `SOS! Мне нужна помощь. Мои координаты: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} — TourHab.ru`
    : 'SOS! Мне нужна помощь — TourHab.ru';

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
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Экстренная помощь</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Звонки и координаты — без интернета
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Координаты */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <MapPin size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ваши координаты
            </p>
            <p style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', margin: '2px 0 0', color: '#fff' }}>
              {coordsLabel}
            </p>
          </div>
        </div>

        {/* Данные + кнопка отправки */}
        <div style={{
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                Ваше имя
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Имя"
                disabled={sendStatus === 'sending' || sendStatus === 'sent'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                Телефон
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+7..."
                disabled={sendStatus === 'sending' || sendStatus === 'sent'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Кнопка отправки координат */}
          <button
            onClick={handleSendSos}
            disabled={sendStatus === 'sending' || sendStatus === 'locating' || sendStatus === 'sent'}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: sendStatus === 'sent' ? '#16a34a'
                : sendStatus === 'error' ? '#ca8a04'
                : sendStatus === 'sending' || sendStatus === 'locating' ? 'rgba(220,38,38,0.5)'
                : '#dc2626',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: sendStatus === 'sending' || sendStatus === 'locating' || sendStatus === 'sent' ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            {sendStatus === 'locating' && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {sendStatus === 'sending' && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {sendStatus === 'sent' && <CheckCircle size={16} />}
            {sendStatus === 'error' && <AlertTriangle size={16} />}
            {sendStatus === 'idle' && '📍 Отправить координаты в Telegram'}
            {sendStatus === 'locating' && 'Определяю координаты...'}
            {sendStatus === 'sending' && 'Отправляю...'}
            {sendStatus === 'sent' && '✅ Координаты отправлены'}
            {sendStatus === 'error' && '⚠️ Ошибка — позвоните 112 напрямую'}
          </button>

          {/* SMS с координатами (без интернета) */}
          {coords && (
            <a
              href={`sms:+79000000000?body=${encodeURIComponent(smsBody)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                marginTop: '8px',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              💬 SMS с координатами (без интернета)
            </a>
          )}
        </div>

        {/* Экстренные номера */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '8px 0 4px' }}>
            Экстренные номера
          </p>
          {SOS_CONTACTS.map((c) => (
            <a
              key={c.phone}
              href={`tel:${c.phone.replace(/\s/g, '')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: c.primary ? '14px' : '12px',
                borderRadius: '12px',
                background: c.primary ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.04)',
                border: c.primary ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.08)',
                textDecoration: 'none',
                color: '#fff',
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: c.primary ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Phone size={16} color={c.primary ? '#f87171' : 'rgba(255,255,255,0.5)'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: c.primary ? '14px' : '13px', fontWeight: 600, marginBottom: '1px' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {c.type}
                </div>
              </div>
              <div style={{
                fontSize: c.primary ? '18px' : '14px',
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

        {/* Регистрация маршрута */}
        <a
          href="/register"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          📋 Зарегистрировать маршрут перед выходом
        </a>

        {/* Памятка */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(234,179,8,0.08)',
          border: '1px solid rgba(234,179,8,0.2)',
        }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
            ⚠️ Если нет связи: оставайтесь на месте · свисток 3 сигнала · сохраняйте тепло
          </p>
        </div>
      </div>

      <style>{`
        @keyframes sos-pulse {
          0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.6); }
          70% { box-shadow: 0 0 0 12px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
