'use client';

import { useState, useEffect } from 'react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Не показывать если пользователь уже отклонил (14 дней)
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      if (Date.now() - dismissedAt < 14 * 24 * 60 * 60 * 1000) {
        return;
      }
    }
    setHidden(false);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Показать через 30 секунд чтобы не раздражать сразу
      setTimeout(() => setShow(true), 30000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShow(false);
  };

  // Не показывать если: скрыт, не ready, или нет deferredPrompt
  if (hidden || !show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[var(--bg-card)] shadow-lg rounded-lg p-4 z-50 border border-[var(--border)]">
      <div className="flex items-start gap-3">
        {/* Иконка — SVG placeholder, будет заменена на PWA иконку */}
        <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h3A2.5 2.5 0 0016 5.5V3.935m3 8.965a2.5 2.5 0 01-4 0m-5.055 3.035a2.5 2.5 0 01-4 0M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-[var(--text-primary)]">Камчатка в кармане</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Установите приложение для офлайн-доступа к маршрутам и SOS.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Установить
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] transition-colors"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
