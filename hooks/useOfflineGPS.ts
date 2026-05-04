'use client';

import { useState, useEffect, useRef } from 'react';

const LS_KEY = 'tourhab_last_gps';

interface CachedPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface OfflineGPSState {
  isOffline: boolean;
  lastPosition: CachedPosition | null;
  minutesAgo: number | null;
}

function readCache(): CachedPosition | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPosition;
  } catch {
    return null;
  }
}

function writeCache(pos: GeolocationPosition): void {
  try {
    const data: CachedPosition = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy),
      timestamp: Date.now(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // localStorage может быть недоступен
  }
}

function minutesSince(timestamp: number): number {
  return Math.round((Date.now() - timestamp) / 60_000);
}

export function useOfflineGPS(): OfflineGPSState {
  const [isOffline, setIsOffline]       = useState(false);
  const [lastPosition, setLastPosition] = useState<CachedPosition | null>(null);
  const [minutesAgo, setMinutesAgo]     = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Инициализация из кэша
    setIsOffline(!navigator.onLine);
    const cached = readCache();
    if (cached) {
      setLastPosition(cached);
      setMinutesAgo(minutesSince(cached.timestamp));
    }

    // Слушатели online/offline
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    // GPS watchPosition — обновляем кэш при каждом фиксе
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          writeCache(pos);
          const updated = readCache();
          if (updated) {
            setLastPosition(updated);
            setMinutesAgo(minutesSince(updated.timestamp));
          }
        },
        () => { /* тихо игнорируем ошибку — юзер мог отклонить */ },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
      );
    }

    // Обновляем minutesAgo каждую минуту
    const ticker = setInterval(() => {
      const c = readCache();
      if (c) setMinutesAgo(minutesSince(c.timestamp));
    }, 60_000);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(ticker);
    };
  }, []);

  return { isOffline, lastPosition, minutesAgo };
}
