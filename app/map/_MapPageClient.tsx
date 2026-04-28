'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Sun, Moon, User, X, ArrowRight, MapPin, WifiOff, Navigation, Target, AlertTriangle, Phone, Loader2, CheckCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import dynamic from 'next/dynamic';
import Logo from '@/components/shared/Logo';
import BottomNav from '@/components/shared/BottomNav';
import { AssistantButton } from '@/components/shared/AssistantButton';
import { MarkerType, type MapMarkerGeometry } from '@/components/shared/LeafletMap';
import { getAllOfflineRoutes } from '@/lib/offline/db';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

// ГДЕ — типы локаций с цветами и иконками на карте
const LOCATION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  volcano:      { label: 'Вулканы',       color: 'orange' },
  geyser:       { label: 'Гейзеры',       color: 'green' },
  hot_spring:   { label: 'Источники',     color: 'red' },
  lake:         { label: 'Озёра',         color: 'lightBlue' },
  mountain:     { label: 'Горы',          color: 'darkBlue' },
  river:        { label: 'Реки',          color: 'teal' },
  bay:          { label: 'Океан',         color: 'darkCyan' },
  waterfall:    { label: 'Водопады',      color: 'blue' },
  cape:         { label: 'Мысы',          color: 'gray' },
  island:       { label: 'Острова',       color: 'purple' },
  rock:         { label: 'Скалы',         color: 'brown' },
  forest:       { label: 'Леса и парки',  color: 'darkGreen' },
  beach:        { label: 'Пляжи',         color: 'orange' },
  viewpoint:    { label: 'Смотровые',     color: 'cyan' },
  settlement:   { label: 'Сёла',          color: 'gray' },
  museum:       { label: 'Музеи',         color: 'purple' },
  historical:   { label: 'История',       color: 'brown' },
  other:        { label: 'Прочее',        color: 'gray' },
};

// Основные фильтры для UI (без мусорных типов)
// id начинающийся с 'activity:' — фильтр по activity_type
const LOCATION_FILTERS = [
  { id: 'all',                  label: 'Все' },
  { id: 'activity:esoteric',    label: 'Места силы' },
  { id: 'volcano',              label: 'Вулканы' },
  { id: 'hot_spring',           label: 'Источники' },
  { id: 'bay',                  label: 'Океан' },
  { id: 'lake',                 label: 'Озёра' },
  { id: 'mountain',             label: 'Горы' },
  { id: 'river',                label: 'Реки' },
  { id: 'geyser',               label: 'Гейзеры' },
  { id: 'waterfall',            label: 'Водопады' },
  { id: 'viewpoint',            label: 'Смотровые' },
  { id: 'rock',                 label: 'Скалы' },
  { id: 'island',               label: 'Острова' },
  { id: 'beach',                label: 'Пляжи' },
  { id: 'forest',               label: 'Леса и парки' },
  { id: 'museum',               label: 'Музеи' },
  { id: 'historical',           label: 'История' },
];

// Фильтры для офлайн-режима (только критичные для безопасности)
const OFFLINE_FILTERS = [
  { id: 'all',        label: 'Все',          icon: Target },
  { id: 'settlement', label: 'Посёлки',      icon: MapPin },
  { id: 'hot_spring', label: 'Источники',    icon: MapPin },
  { id: 'volcano',    label: 'Вулканы',      icon: MapPin },
  { id: 'river',      label: 'Реки',         icon: MapPin },
  { id: 'lake',       label: 'Озёра',        icon: MapPin },
  { id: 'mountain',   label: 'Горы',         icon: MapPin },
  { id: 'forest',     label: 'Лес',          icon: MapPin },
];

interface RoutePoint {
  id: string;
  title: string;
  locationType: string | null;
  activityType: string | null;
  lat: number;
  lng: number;
  description: string;
  volcanoStatus?: string | null;
  geometry?: MapMarkerGeometry | null;
}

const VOLCANO_STATUS_COLOR: Record<string, string> = {
  erupting:          'red',
  active:            'orange',
  potentially_active: 'yellow',
  dormant:           'gray',
  unknown:           'gray',
};

/** Расстояние в метрах между двумя точками (формула Haversine) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // радиус Земли в метрах
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Форматирование расстояния */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
}

export default function MapPageClient() {
  const { isDark, toggleTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('all');
  const [allRoutes, setAllRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showMyLocation, setShowMyLocation] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [sosSending, setSosSending] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // SOS-контакты захардкожены — работают ВСЕГДА, даже без IndexedDB.
  // tel: ссылки работают через мобильную сеть, интернет НЕ нужен.
  const SOS_CONTACTS = [
    { name: 'Единый номер экстренных служб', phone: '112', type: 'МЧС' },
    { name: 'Скорая медицинская помощь', phone: '103', type: 'Медицина' },
    { name: 'Полиция', phone: '102', type: 'Правоохранительные' },
    { name: 'МЧС Камчатский край', phone: '+74152235362', type: 'МЧС' },
    { name: 'ПСО «Камчатка» (ПКГО)', phone: '+74152412730', type: 'Спасатели' },
  ] as const;

  const selectedRoute = selectedId ? allRoutes.find(r => r.id === selectedId) ?? null : null;
  const handleMarkerClick = useCallback((id: string) => setSelectedId(id), []);

  // GPS-трекинг — работает БЕЗ интернета!
  useEffect(() => {
    if (!showMyLocation || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => { /* ошибка — молча */ },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [showMyLocation]);

  // SOS-контакты захардкожены — НЕ зависят от IndexedDB, работают ВСЕГДА.
  // tel: ссылки работают через сотовую сеть, интернет НЕ нужен.

  // Фоновая подгрузка зум 10 при первом посещении /map онлайн
  // ~1600 тайлов (~25 МБ) — загрузится один раз, потом карта детальная офлайн
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    if (typeof window === 'undefined') return;
    const key = 'kh-zoom10-cached';
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_ZOOM10' });
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setIsOffline(offline);

      if (offline) {
        // Офлайн-режим: загружаем маршруты из IndexedDB
        try {
          const cached = await getAllOfflineRoutes();
          const points: RoutePoint[] = cached
            .filter((r) => r.lat != null && r.lng != null)
            .map((r): RoutePoint => ({
              id:           r.id,
              title:        r.title,
              locationType: r.locationType ?? 'other',
              activityType: r.activityType ?? null,
              lat:          r.lat,
              lng:          r.lng,
              description:  r.description ?? '',
              volcanoStatus: null,
              geometry:     r.geometry as MapMarkerGeometry | null ?? null,
            }));
          setAllRoutes(points);
        } catch {
          // IndexedDB недоступен
        } finally {
          setLoading(false);
        }
        return;
      }

      // Онлайн-режим: обычный API
      try {
        const res = await fetch('/api/routes?hasCoords=true&limit=1500&sort=title&kind=place');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;
        const points: RoutePoint[] = (data.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: { id: string; title: string; locationType: string | null; activityType: string | null; lat: number; lng: number; description: string; volcanoStatus?: string | null; geometry?: MapMarkerGeometry | null }) => ({
            id:           r.id,
            title:         r.title,
            locationType:  r.locationType ?? 'other',
            activityType:  r.activityType ?? null,
            lat:           r.lat,
            lng:           r.lng,
            description:   r.description ?? '',
            volcanoStatus: r.volcanoStatus ?? null,
            geometry:      r.geometry ?? null,
          }));
        setAllRoutes(points);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    load();

    // Слушаем смену статуса сети
    const handleOnline = () => { setIsOffline(false); load(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filters = isOffline ? OFFLINE_FILTERS : LOCATION_FILTERS;

  const filtered = useMemo(() =>
    activeFilter === 'all'
      ? allRoutes
      : activeFilter.startsWith('activity:')
        ? allRoutes.filter(r => r.activityType === activeFilter.slice(9))
        : allRoutes.filter(r => r.locationType === activeFilter),
  [allRoutes, activeFilter]);

  const countFor = useCallback((id: string) => {
    if (id === 'all') return allRoutes.length;
    if (id.startsWith('activity:')) return allRoutes.filter(r => r.activityType === id.slice(9)).length;
    return allRoutes.filter(r => r.locationType === id).length;
  }, [allRoutes]);

  // Маркеры с расстояниями (в офлайн-режиме)
  const mapMarkers = useMemo(() => filtered.map(r => {
    const cfg = LOCATION_TYPE_CONFIG[r.locationType ?? 'other'] ?? LOCATION_TYPE_CONFIG.other;
    const baseColor = r.locationType === 'volcano' && r.volcanoStatus
      ? (VOLCANO_STATUS_COLOR[r.volcanoStatus] ?? cfg.color)
      : cfg.color;
    const color = (activeFilter === 'activity:esoteric' && r.activityType === 'esoteric')
      ? 'purple'
      : baseColor;

    // Расстояние от пользователя (если известно)
    const dist = userPos ? haversineDistance(userPos.lat, userPos.lng, r.lat, r.lng) : null;
    const desc = dist !== null
      ? `${formatDistance(dist)} · ${r.description.split('\n')[0].slice(0, 80)}`
      : r.description.split('\n')[0].slice(0, 120);

    return {
      id:          r.id,
      coords:      [r.lat, r.lng] as [number, number],
      title:       r.title,
      description: desc,
      color,
      href:        `/routes/${r.id}`,
      type:        MarkerType.TOUR,
      category:    r.locationType ?? 'other',
      geometry:    r.geometry ?? undefined,
      // В офлайне: показываем балун (без suppressBalloon) — человек должен видеть описание точки без клика на маршрут-страницу (нет интернета)
      suppressBalloon: false,
    };
  }), [filtered, activeFilter, userPos]);

  // ── ОФЛАЙН-РЕЖИМ ──────────────────────────────────────────────────
  if (isOffline) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Офлайн-баннер сверху */}
        <div className="absolute top-0 left-0 right-0 z-[500] px-3 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-amber-500/40 text-amber-300 text-sm">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span className="font-medium">Офлайн</span>
            <span className="text-amber-300/60">·</span>
            <span>{allRoutes.length} точек</span>
            {/* Кнопка GPS-позиции */}
            <button
              onClick={() => setShowMyLocation(!showMyLocation)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                showMyLocation
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              {showMyLocation ? 'GPS ON' : 'GPS'}
            </button>
          </div>
        </div>

        {/* Кнопка «Скачать регионы» — доступ к офлайн-управлению */}
        <div className="absolute top-16 right-3 z-[500] flex flex-col gap-2">
          <Link
            href="/offline/manage"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium hover:bg-black/80 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Скачать
          </Link>
          {/* 🔴 SOS — показать экстренные номера */}
          <button
            onClick={() => setShowSos(!showSos)}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
              showSos
                ? 'bg-white text-red-600'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            style={!showSos ? { animation: 'kh-sos-pulse 2s ease-out infinite' } : {}}
          >
            SOS
          </button>
        </div>

        {/* Карта на весь экран */}
        <LeafletMap
          center={[53.0444, 158.6483]}
          zoom={8}
          markers={mapMarkers}
          height="100dvh"
          attribution={false}
          onMarkerClick={handleMarkerClick}
          showUserLocation={showMyLocation}
          locationPriority="highAccuracy"
          className="bg-black"
        />

        {/* Фильтры — снизу, поверх карты, крупные для перчаток */}
        <div className="absolute bottom-0 left-0 right-0 z-[500]">
          <div className="bg-black/60 backdrop-blur-md border-t border-white/10 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {OFFLINE_FILTERS.map(f => {
                const cnt = countFor(f.id);
                if (f.id !== 'all' && cnt === 0) return null;
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all min-h-[44px] ${
                      activeFilter === f.id
                        ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {f.label}
                    <span className={`text-xs ${activeFilter === f.id ? 'opacity-70' : 'text-white/40'}`}>
                      {loading ? '…' : cnt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* GPS-координаты пользователя */}
        {userPos && showMyLocation && (
          <div className="absolute bottom-20 left-3 z-[500] bg-black/60 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5">
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Вы здесь</p>
            <p className="text-xs text-white font-mono">{userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</p>
          </div>
        )}

        {/* 🔴 SOS-панель — экстренные номера (tel: ссылки работают без интернета!) */}
        {showSos && (
          <div className="absolute bottom-24 left-3 right-3 z-[500] rounded-xl bg-black/85 backdrop-blur-xl border border-red-500/40 shadow-2xl shadow-red-900/20">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <span className="text-red-500">🆘</span> Экстренные номера
                </h3>
                <button
                  onClick={() => setShowSos(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Координаты */}
              {userPos && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">📍 Ваши координаты</p>
                  <p className="text-sm text-white font-mono">{userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {SOS_CONTACTS.map((c) => (
                  <a
                    key={c.phone}
                    href={`tel:${c.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:bg-white/15"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.name}</p>
                      <p className="text-white/40 text-xs">{c.type}</p>
                    </div>
                    <span className="text-white font-bold text-sm font-mono flex-shrink-0">{c.phone}</span>
                  </a>
                ))}
              </div>

              {/* Кнопка: отправить координаты в Telegram */}
              <button
                onClick={async () => {
                  if (sosSending !== 'idle') return;
                  setSosSending('sending');
                  try {
                    const res = await fetch('/api/safety/sos', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        lat: userPos?.lat,
                        lng: userPos?.lng,
                      }),
                    });
                    if (res.ok) setSosSending('sent');
                    else setSosSending('error');
                  } catch {
                    setSosSending('error');
                  }
                }}
                className={`w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all ${
                  sosSending === 'sent'
                    ? 'bg-green-600 text-white'
                    : sosSending === 'error'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                }`}
              >
                {sosSending === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
                {sosSending === 'sent' && <CheckCircle className="w-4 h-4" />}
                {sosSending === 'idle' && '📍 Отправить координаты'}
                {sosSending === 'sending' && 'Отправляю...'}
                {sosSending === 'sent' && '✅ Координаты отправлены'}
                {sosSending === 'error' && '⚠️ Ошибка — позвоните 112'}
              </button>

              {/* SMS с координатами (работает без интернета) */}
              {userPos && (
                <a
                  href={`sms:+79000000000?body=SOS! Помогите. Мои координаты: ${userPos.lat.toFixed(5)}, ${userPos.lng.toFixed(5)} — TourHab.ru`}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/15 active:bg-white/20 transition-all"
                >
                  💬 SMS с координатами (без интернета)
                </a>
              )}
              <p className="text-[10px] text-white/30 mt-3 text-center">
                Звонки работают без интернета · GPS определяет ваши координаты
              </p>
            </div>
          </div>
        )}

        {/* Панель выбранного маршрута */}
        {selectedRoute && (
          <div
            className="absolute bottom-24 left-3 right-3 z-[500] rounded-xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl"
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent)]" />
                    <span className="text-[10px] text-white/50 uppercase tracking-wide">
                      {LOCATION_TYPE_CONFIG[selectedRoute.locationType ?? 'other']?.label ?? 'Маршрут'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white leading-snug"
                      style={{ fontFamily: 'var(--font-playfair)' }}>
                    {selectedRoute.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Расстояние от пользователя */}
              {userPos && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-white/5">
                  <Navigation className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white font-bold">
                    {formatDistance(haversineDistance(userPos.lat, userPos.lng, selectedRoute.lat, selectedRoute.lng))}
                  </span>
                  <span className="text-xs text-white/40">от вас</span>
                </div>
              )}

              {selectedRoute.description && (
                <p className="text-sm text-white/60 leading-relaxed line-clamp-3 mb-4">
                  {selectedRoute.description.split('\n')[0]}
                </p>
              )}

              <Link
                href={`/routes/${selectedRoute.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg
                  bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Открыть маршрут
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ОНЛАЙН-РЕЖИМ ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Header */}
      <header className="relative z-[700] bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo size={28} />
          </Link>
          <h1 className="text-lg font-bold text-[var(--text-primary)] hidden sm:block"
              style={{ fontFamily: 'var(--font-playfair)' }}>
            Карта Камчатки
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/profile" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Личный кабинет">
              <User size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Фильтры по типу локации (ГДЕ) — z-[600] чтобы быть поверх Leaflet карты */}
      <div className="relative z-[600] px-4 py-3 overflow-x-auto bg-[var(--bg-primary)]">
        <div className="flex flex-wrap gap-2">
          {LOCATION_FILTERS.map(f => {
            const cnt = countFor(f.id);
            if (f.id !== 'all' && cnt === 0) return null;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]'
                }`}
              >
                {f.label}
                <span className={`ml-1 text-xs ${activeFilter === f.id ? 'opacity-70' : 'text-[var(--text-muted)]'}`}>
                  {loading ? '…' : cnt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Карта */}
      <div className="px-4 pb-4">
        <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
          <LeafletMap
            center={[53.0444, 158.6483]}
            zoom={7}
            markers={mapMarkers}
            height="calc(100vh - 180px)"
            attribution={false}
            onMarkerClick={handleMarkerClick}
            showUserLocation={showMyLocation}
            locationPriority="highAccuracy"
          />

          {/* Кнопка GPS */}
          <button
            onClick={() => setShowMyLocation(!showMyLocation)}
            className={`absolute top-3 right-3 z-[500] p-2.5 rounded-lg shadow-lg transition-all ${
              showMyLocation
                ? 'bg-blue-500 text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]'
            }`}
            aria-label="Показать моё местоположение"
          >
            <Navigation size={18} />
          </button>

          {/* Счётчик */}
          <div className="absolute bottom-3 left-3 z-[500] bg-[var(--bg-card)] rounded-lg px-3 py-1.5 border border-[var(--border)] shadow-sm">
            <p className="text-sm text-[var(--text-secondary)]">
              {loading
                ? 'Загрузка...'
                : <>Точек: <span className="font-bold text-[var(--accent)]">{filtered.length}</span></>
              }
            </p>
          </div>
        </div>
      </div>

      {/* ── Панель маршрута ─────────────────────────────────────────────── */}
      {selectedRoute && (
        <div
          className="fixed bottom-[5.5rem] left-2 right-2 rounded-xl md:bottom-4 md:right-4 md:left-auto md:w-96 z-[500]
            bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl"
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          <div className="p-4">
            {/* Шапка */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                    {LOCATION_TYPE_CONFIG[selectedRoute.locationType ?? 'other']?.label ?? 'Маршрут'}
                  </span>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] leading-snug"
                    style={{ fontFamily: 'var(--font-playfair)' }}>
                  {selectedRoute.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Расстояние */}
            {userPos && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                <Navigation className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {formatDistance(haversineDistance(userPos.lat, userPos.lng, selectedRoute.lat, selectedRoute.lng))}
                </span>
                <span className="text-xs text-[var(--text-muted)]">от вас</span>
              </div>
            )}

            {/* Описание */}
            {selectedRoute.description && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4 mb-4">
                {selectedRoute.description.split('\n')[0]}
              </p>
            )}

            {/* Кнопка */}
            <Link
              href={`/routes/${selectedRoute.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg
                bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Открыть маршрут
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Кнопка «Я вернулся» — для активных маршрутов */}
      <Link
        href="/return"
        className="fixed top-20 left-3 z-[500] flex items-center gap-2 px-3 py-2 rounded-lg
          bg-green-600/90 backdrop-blur-sm text-white text-xs font-semibold shadow-lg
          hover:bg-green-700 transition-colors"
      >
        ✅ Я вернулся
      </Link>

      <BottomNav activePath="/map" />
      <AssistantButton pageContext={{ type: 'map' }} />
    </div>
  );
}
