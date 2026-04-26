'use client';

/**
 * GeoContext — геолокация и режим "Я на Камчатке".
 *
 * Геолокация запрашивается ТОЛЬКО по явному действию пользователя
 * (кнопка "Я на Камчатке" в шапке). Никаких автоматических запросов
 * permission при загрузке страницы.
 *
 * Режим сохраняется в localStorage и восстанавливается при следующем визите.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  isInKamchatka,
  regionName,
  KAMCHATKA_CENTER,
  type GeoMode,
  type UserLocation,
} from '@/lib/geo/kamchatka';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

interface GeoContextValue {
  mode: GeoMode;
  location: UserLocation | null;
  region: string;
  permissionState: PermissionState;
  lastError: string | null;
  /** Запросить геолокацию и переключить в on-site если на Камчатке */
  enableOnSite: () => void;
  /** Вернуться в режим планирования */
  disableOnSite: () => void;
}

const GeoContext = createContext<GeoContextValue>({
  mode: 'unknown',
  location: null,
  region: '',
  permissionState: 'prompt',
  lastError: null,
  enableOnSite: () => {},
  disableOnSite: () => {},
});

const LS_MODE_KEY = 'kh-geo-mode';
const LS_LOC_KEY = 'kh-geo-location';

function loadPersisted(): { mode: GeoMode; location: UserLocation | null } {
  try {
    const mode = localStorage.getItem(LS_MODE_KEY) as GeoMode | null;
    const locRaw = localStorage.getItem(LS_LOC_KEY);
    const location = locRaw ? (JSON.parse(locRaw) as UserLocation) : null;
    return { mode: mode ?? 'unknown', location };
  } catch {
    return { mode: 'unknown', location: null };
  }
}

function savePersisted(mode: GeoMode, location: UserLocation | null): void {
  try {
    if (mode === 'unknown') {
      localStorage.removeItem(LS_MODE_KEY);
      localStorage.removeItem(LS_LOC_KEY);
    } else {
      localStorage.setItem(LS_MODE_KEY, mode);
      if (location) {
        localStorage.setItem(LS_LOC_KEY, JSON.stringify(location));
      } else {
        localStorage.removeItem(LS_LOC_KEY);
      }
    }
  } catch {
    // localStorage недоступен — игнорируем
  }
}

export function GeoProvider({ children }: { children: ReactNode }) {
  const persisted = useRef(loadPersisted());
  const [mode, setMode] = useState<GeoMode>(persisted.current.mode);
  const [location, setLocation] = useState<UserLocation | null>(persisted.current.location);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [lastError, setLastError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const region = location ? regionName(location.lat, location.lng) : '';

  const enableOnSite = useCallback(() => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLastError(null);

    if (!navigator.geolocation) {
      setPermissionState('unsupported');
      setLastError('Геолокация не поддерживается в этом браузере');
      fetchingRef.current = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setLocation(loc);
        setPermissionState('granted');
        setLastError(null);

        if (isInKamchatka(loc.lat, loc.lng)) {
          setMode('on-site');
          savePersisted('on-site', loc);
        } else {
          // Юзер не на Камчатке — показываем режим планирования
          setMode('planning');
          setLastError('Вы не на Камчатке. Включите режим когда приедете.');
          savePersisted('planning', null);
        }
        fetchingRef.current = false;
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Доступ к геолокации запрещён. Разрешите в настройках браузера.',
          2: 'Не удалось определить местоположение.',
          3: 'Превышено время ожидания геолокации.',
        };
        setLastError(messages[err.code] ?? 'Ошибка геолокации');
        if (err.code === 1) setPermissionState('denied');
        fetchingRef.current = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300_000 },
    );
  }, []);

  const disableOnSite = useCallback(() => {
    setMode('planning');
    setLocation(null);
    setLastError(null);
    savePersisted('planning', null);
  }, []);

  // Если при загрузке уже был сохранённый on-site — обновляем координаты
  useEffect(() => {
    if (mode !== 'on-site' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setLocation(loc);
        savePersisted('on-site', loc);
      },
      () => {
        // Если permission denied — сбрасываем
        setMode('planning');
        savePersisted('planning', null);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600_000 },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: GeoContextValue = {
    mode,
    location,
    region,
    permissionState,
    lastError,
    enableOnSite,
    disableOnSite,
  };

  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}

export function useGeo(): GeoContextValue {
  return useContext(GeoContext);
}
