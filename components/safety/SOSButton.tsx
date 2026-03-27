'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Phone, User, MapPin, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';

type SosStatus = 'idle' | 'locating' | 'sending' | 'sent' | 'error';

function SOSButton({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sosStatus, setSosStatus] = useState<SosStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [touristName, setTouristName] = useState('');
  const [touristPhone, setTouristPhone] = useState('');

  const handleSendCoords = useCallback(async () => {
    if (sosStatus === 'sending' || sosStatus === 'sent') return;

    setSosStatus('locating');
    setErrorMsg(null);

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
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      } catch {
        // Геолокация недоступна — отправляем без координат
      }
    }

    setSosStatus('sending');

    try {
      const res = await fetch('/api/safety/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat:           position?.coords.latitude  ?? null,
          lng:           position?.coords.longitude ?? null,
          accuracy:      position?.coords.accuracy  ?? null,
          tourist_name:  touristName.trim() || undefined,
          tourist_phone: touristPhone.trim() || undefined,
        }),
      });

      if (res.status === 429) {
        setErrorMsg('SOS уже отправлен. Повторите через 10 минут.');
        setSosStatus('error');
        return;
      }

      setSosStatus('sent');
    } catch {
      setErrorMsg('Ошибка отправки. Звоните 112 напрямую.');
      setSosStatus('error');
    }
  }, [sosStatus, touristName, touristPhone]);

  const coordsLabel = coords
    ? `${coords.lat.toFixed(5)}° N, ${coords.lng.toFixed(5)}° E (±${Math.round(coords.accuracy)} м)`
    : 'Координаты не определены';

  return (
    <>
      <motion.button
        className={`fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-[var(--danger)] text-[var(--bg-card)] flex flex-col items-center justify-center font-bold text-sm shadow-2xl sos-pulse min-h-[44px] min-w-[44px] ${className}`}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="SOS — экстренная помощь"
      >
        SOS
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Экстренная помощь — SOS"
          >
            <motion.div
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck size={28} className="text-[var(--danger)]" aria-hidden="true" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Экстренная помощь</h2>
              </div>

              <p className="text-sm text-[var(--text-secondary)] mb-6 p-3 bg-[var(--bg-hover)] rounded-lg">
                <MapPin size={16} className="inline mr-2" aria-hidden="true" />
                {coordsLabel}
              </p>

              {/* Данные туриста */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-1">
                    <User size={12} />
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    value={touristName}
                    onChange={e => setTouristName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="ds-input w-full text-sm"
                    disabled={sosStatus === 'sending' || sosStatus === 'sent'}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-1">
                    <Phone size={12} />
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={touristPhone}
                    onChange={e => setTouristPhone(e.target.value)}
                    placeholder="+7 900 000 00 00"
                    className="ds-input w-full text-sm"
                    disabled={sosStatus === 'sending' || sosStatus === 'sent'}
                  />
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <motion.a
                  href="tel:112"
                  className="w-full flex items-center justify-between p-4 bg-[var(--danger)] text-[var(--bg-card)] rounded-lg font-semibold min-h-[44px]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Позвонить в МЧС 112"
                >
                  <div className="flex items-center gap-3">
                    <Phone size={20} aria-hidden="true" />
                    МЧС: 112
                  </div>
                  <span>ЗВОНОК</span>
                </motion.a>

                <motion.a
                  href="tel:103"
                  className="w-full flex items-center justify-between p-4 bg-[var(--danger)] text-[var(--bg-card)] rounded-lg font-semibold min-h-[44px]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Позвонить в скорую 103"
                >
                  <div className="flex items-center gap-3">
                    <Phone size={20} aria-hidden="true" />
                    Скорая: 103
                  </div>
                  <span>ЗВОНОК</span>
                </motion.a>

                <motion.button
                  className="w-full flex items-center justify-between p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg font-semibold min-h-[44px]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Связаться с гидом"
                >
                  <div className="flex items-center gap-3">
                    <User size={20} aria-hidden="true" />
                    Связаться с гидом
                  </div>
                  <span>ЧАТ</span>
                </motion.button>

                <motion.button
                  className="w-full flex items-center justify-between p-4 bg-[var(--success)] text-[var(--bg-card)] rounded-lg font-semibold min-h-[44px] disabled:opacity-60"
                  whileHover={{ scale: sosStatus === 'sent' ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendCoords}
                  disabled={sosStatus === 'sending' || sosStatus === 'locating' || sosStatus === 'sent'}
                  aria-label="Отправить координаты"
                >
                  <div className="flex items-center gap-3">
                    {sosStatus === 'sent' ? (
                      <CheckCircle size={20} aria-hidden="true" />
                    ) : (sosStatus === 'locating' || sosStatus === 'sending') ? (
                      <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <MapPin size={20} aria-hidden="true" />
                    )}
                    {sosStatus === 'locating' && 'Определяю координаты...'}
                    {sosStatus === 'sending' && 'Отправляю...'}
                    {sosStatus === 'sent' && 'Координаты отправлены'}
                    {(sosStatus === 'idle' || sosStatus === 'error') && 'Отправить координаты'}
                  </div>
                  {(sosStatus === 'idle' || sosStatus === 'error') && <span>ОТПРАВИТЬ</span>}
                </motion.button>
              </div>

              <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg p-4" aria-live="polite">
                <AlertTriangle size={20} className="text-[var(--warning)] inline mr-2 mb-2 block" aria-hidden="true" />
                {errorMsg ? (
                  <p className="text-sm text-[var(--danger)] leading-relaxed">{errorMsg}</p>
                ) : (
                  <p className="text-sm text-[var(--warning)] leading-relaxed">
                    Если нет связи: оставайтесь на месте · свисток 3 сигнала · сохраняйте тепло
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export { SOSButton };
export default SOSButton;
