'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Truck, AlertTriangle, Thermometer, Wind, Droplets, Activity, Phone, RefreshCw, MountainSnow, TriangleAlert } from 'lucide-react';

interface WeatherData {
  tempC: string;
  feelsLikeC: string;
  desc: string;
  humidity: string;
  windKmph: string;
  updatedAt?: string;
}

interface SeismicEvent {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  depth: number;
}

type SosStatus = 'idle' | 'locating' | 'sending' | 'sent' | 'error';

const EMERGENCY_CONTACTS = [
  { name: 'Единая служба спасения', number: '112' },
  { name: 'Полиция', number: '102' },
  { name: 'Скорая помощь', number: '103' },
  { name: 'МЧС Камчатки', number: '8 (4152) 29-99-99' },
  { name: 'ПАСС Камчатки (поиск и спасение)', number: '8 (4152) 41-03-03' },
  { name: 'Дежурный КГКУ ЭКОСПАС', number: '8 (4152) 42-40-27' },
];

// Avalanche zones — Kamchatka
const AVALANCHE_ZONES = [
  { name: 'Авачинский вулкан', risk: 3, note: 'Северные и западные склоны, выше 1200 м' },
  { name: 'Корякский вулкан', risk: 4, note: 'Все склоны, особенно NW экспозиция' },
  { name: 'Вилючинский перевал', risk: 3, note: 'Лавинные кулуары активны' },
  { name: 'Мутновский р-н', risk: 2, note: 'Умеренная опасность' },
  { name: 'Козельский вулкан', risk: 3, note: 'Снежные карнизы на гребнях' },
  { name: 'Красная сопка (горнолыжн.)', risk: 2, note: 'Подготовленные трассы — низкий риск' },
];

const DANGER_LEVEL = {
  1: { label: 'Незначительная', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 10%, transparent)', desc: 'Снежный покров устойчив. Лавины возможны только при больших дополнительных нагрузках.' },
  2: { label: 'Умеренная', color: '#8DB000', bg: 'color-mix(in srgb, #8DB000 10%, transparent)', desc: 'На крутых склонах снег умеренно устойчив. Самопроизвольный сход маловероятен.' },
  3: { label: 'Значительная', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 10%, transparent)', desc: 'На крутых склонах снег неустойчив. Возможен самопроизвольный сход. Осторожность обязательна.' },
  4: { label: 'Высокая', color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 12%, transparent)', desc: 'Снег неустойчив на большинстве крутых склонов. Множественные самопроизвольные лавины.' },
  5: { label: 'Очень высокая', color: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 10%, transparent)', desc: 'Снег крайне неустойчив. Катастрофические лавины возможны на пологих склонах.' },
} as const;

function riskLevel(r: number): typeof DANGER_LEVEL[1 | 2 | 3 | 4 | 5] {
  const clamped = Math.max(1, Math.min(5, r)) as 1 | 2 | 3 | 4 | 5;
  return DANGER_LEVEL[clamped];
}

function magColor(mag: number): string {
  if (mag >= 5.5) return 'var(--danger)';
  if (mag >= 4.0) return 'var(--warning)';
  return 'var(--text-secondary)';
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h} ч назад`;
  if (m > 0) return `${m} мин назад`;
  return 'только что';
}

export default function SafetyHubClient() {
  const [activeTab, setActiveTab] = useState('sos');

  // SOS
  const [sosStatus, setSosStatus] = useState<SosStatus>('idle');
  const [sosError, setSosError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsLoading, setCoordsLoading] = useState(false);

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Seismic
  const [seismic, setSeismic] = useState<SeismicEvent[]>([]);
  const [seismicLoading, setSeismicLoading] = useState(false);
  const [seismicError, setSeismicError] = useState<string | null>(null);
  const [seismicLastUpdate, setSeismicLastUpdate] = useState<Date | null>(null);

  // Тихий трекинг визита для Rescue агента
  useEffect(() => {
    fetch('/api/safety/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tab: 'sos' }) }).catch(() => {});
  }, []);

  // Passive geolocation on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setCoordsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCoordsLoading(false);
      },
      () => setCoordsLoading(false),
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const fetchWeather = useCallback(() => {
    setWeatherLoading(true);
    setWeatherError(null);
    fetch('/api/safety/weather')
      .then((r) => r.json())
      .then((d: WeatherData & { error?: string }) => {
        if (d.error) { setWeatherError(d.error); return; }
        setWeather(d);
      })
      .catch(() => setWeatherError('Не удалось загрузить прогноз погоды'))
      .finally(() => setWeatherLoading(false));
  }, []);

  const fetchSeismic = useCallback(() => {
    setSeismicLoading(true);
    setSeismicError(null);
    fetch('/api/safety/seismic')
      .then((r) => r.json())
      .then((d: { events?: SeismicEvent[]; error?: string; updatedAt?: string }) => {
        if (d.error) { setSeismicError(d.error); return; }
        setSeismic(d.events || []);
        setSeismicLastUpdate(new Date());
      })
      .catch(() => setSeismicError('Не удалось загрузить данные сейсмики'))
      .finally(() => setSeismicLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'weather' && !weather && !weatherLoading) fetchWeather();
  }, [activeTab, weather, weatherLoading, fetchWeather]);

  useEffect(() => {
    if (activeTab === 'seismic' && seismic.length === 0 && !seismicLoading) fetchSeismic();
  }, [activeTab, seismic.length, seismicLoading, fetchSeismic]);

  const handleSOS = useCallback(async () => {
    setSosStatus('locating');
    setSosError(null);

    let latitude = coords?.lat;
    let longitude = coords?.lng;

    if (!latitude && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        setCoords({ lat: latitude, lng: longitude });
      } catch {
        // proceed without coords
      }
    }

    setSosStatus('sending');

    try {
      const res = await fetch('/api/safety/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, emergency_type: 'general' }),
      });
      if (res.ok) {
        setSosStatus('sent');
      } else {
        const data = await res.json().catch(() => ({}));
        setSosError((data as { error?: string }).error || 'Ошибка отправки сигнала');
        setSosStatus('error');
      }
    } catch {
      setSosError('Нет соединения с сервером');
      setSosStatus('error');
    }
  }, [coords]);

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">SOS и безопасность</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Экстренные службы и информация о безопасности</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {[
          { id: 'sos', label: 'SOS' },
          { id: 'emergency', label: 'МЧС' },
          { id: 'avalanche', label: 'Лавины' },
          { id: 'seismic', label: 'Сейсмика' },
          { id: 'weather', label: 'Погода' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SOS ── */}
      {activeTab === 'sos' && (
        <div className="space-y-5">
          <div
            className="border rounded-lg p-6 text-center"
            style={{
              borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)',
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
            }}
          >
            <AlertTriangle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--danger)' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--danger)' }}>
              ЭКСТРЕННЫЙ ВЫЗОВ
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Нажмите кнопку — сигнал будет отправлен с вашими координатами
            </p>

            {sosStatus === 'idle' && (
              <button
                onClick={handleSOS}
                className="px-8 py-3 rounded-lg text-lg font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
                style={{ background: 'var(--danger)' }}
              >
                ВЫЗВАТЬ SOS
              </button>
            )}
            {(sosStatus === 'locating' || sosStatus === 'sending') && (
              <div className="flex items-center justify-center gap-2 text-[var(--danger)] font-semibold">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{sosStatus === 'locating' ? 'Определение координат...' : 'Отправка сигнала...'}</span>
              </div>
            )}
            {sosStatus === 'sent' && (
              <div className="space-y-2">
                <p className="text-base font-bold" style={{ color: 'var(--success)' }}>
                  Сигнал SOS отправлен
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Немедленно позвоните <span className="font-bold">112</span>
                </p>
                <button
                  onClick={() => { setSosStatus('idle'); setSosError(null); }}
                  className="mt-2 px-4 py-1.5 text-sm border border-[var(--border)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Сбросить
                </button>
              </div>
            )}
            {sosStatus === 'error' && (
              <div className="space-y-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                  {sosError}
                </p>
                <p className="text-sm text-[var(--text-muted)]">Звоните напрямую: 112</p>
                <button
                  onClick={() => { setSosStatus('idle'); setSosError(null); }}
                  className="mt-1 px-4 py-1.5 text-sm border border-[var(--border)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Повторить
                </button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Экстренные номера</h3>
              <div className="space-y-2">
                {EMERGENCY_CONTACTS.slice(0, 3).map((c) => (
                  <div key={c.name} className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{c.name}</span>
                    <a
                      href={`tel:${c.number.replace(/\s/g, '')}`}
                      className="font-mono font-semibold text-[var(--ocean)]"
                    >
                      {c.number}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Ваша локация</h3>
              {coordsLoading && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Определение координат...</span>
                </div>
              )}
              {!coordsLoading && coords && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[var(--ocean)]" />
                    <span className="font-mono text-[var(--text-primary)]">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Координаты будут отправлены вместе с SOS</p>
                </div>
              )}
              {!coordsLoading && !coords && (
                <div className="text-center text-[var(--text-muted)] py-4">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
                  <p className="text-sm">Доступ к геолокации не предоставлен</p>
                  <p className="text-xs mt-1">SOS будет отправлен без координат</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── МЧС ── */}
      {activeTab === 'emergency' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-[var(--ocean)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">МЧС и спасательные службы Камчатки</h3>
            </div>
            <div className="space-y-3">
              {EMERGENCY_CONTACTS.map((c) => (
                <div key={c.name} className="flex justify-between items-center text-sm py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{c.name}</span>
                  </div>
                  <a
                    href={`tel:${c.number.replace(/\s/g, '')}`}
                    className="font-mono font-semibold text-[var(--ocean)] hover:underline"
                  >
                    {c.number}
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Зоны поиска и спасения</h3>
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p>Поисково-спасательный отряд МЧС России по Камчатскому краю дежурит круглосуточно.</p>
              <p className="mt-2 font-medium text-[var(--text-primary)]">При выходе в горы обязательно:</p>
              <ul className="space-y-1 ml-4 list-disc text-[var(--text-secondary)]">
                <li>Зарегистрируйтесь у оператора или гида</li>
                <li>Сообщите маршрут и ожидаемое время возвращения</li>
                <li>Возьмите заряженный телефон, аптечку, запас воды</li>
                <li>Проверьте прогноз погоды на pogoda.ksc.ru</li>
              </ul>
            </div>
          </div>

          <div
            className="border rounded-lg p-4"
            style={{
              borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)',
              background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
              Вулканическая активность
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Актуальный статус вулканов: KVERT (kscnet.ru/ivs/kvert)
            </p>
          </div>
        </div>
      )}

      {/* ── Лавины ── */}
      {activeTab === 'avalanche' && (
        <div className="space-y-4">
          {/* Overall level */}
          <div
            className="border rounded-lg p-5"
            style={{
              borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)',
              background: DANGER_LEVEL[3].bg,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MountainSnow className="w-5 h-5" style={{ color: DANGER_LEVEL[3].color }} />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Лавинная опасность — Камчатка</h2>
              </div>
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: DANGER_LEVEL[3].color }}
              >
                <span className="text-white font-bold text-lg leading-none">3</span>
                <span className="text-white text-xs font-medium">/ 5</span>
              </div>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: DANGER_LEVEL[3].color }}>
              {DANGER_LEVEL[3].label}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">{DANGER_LEVEL[3].desc}</p>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Март — апрель: пик лавинной активности. Интенсивное весеннее снеготаяние + циклонические осадки.
            </p>
          </div>

          {/* Danger scale */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Шкала лавинной опасности</h3>
            <div className="space-y-2">
              {([1, 2, 3, 4, 5] as const).map((level) => {
                const d = DANGER_LEVEL[level];
                const isActive = level === 3;
                return (
                  <div
                    key={level}
                    className="flex items-center gap-3 p-2 rounded-md text-sm"
                    style={isActive ? { background: d.bg } : {}}
                  >
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                      style={{ background: d.color }}
                    >
                      {level}
                    </div>
                    <div>
                      <span
                        className={`font-medium ${isActive ? '' : 'text-[var(--text-secondary)]'}`}
                        style={isActive ? { color: d.color } : {}}
                      >
                        {d.label}
                      </span>
                      {isActive && (
                        <span className="ml-2 text-xs text-[var(--text-muted)]">— текущий уровень</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zones */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Зоны риска</h3>
            <div className="space-y-2">
              {AVALANCHE_ZONES.map((zone) => {
                const d = riskLevel(zone.risk);
                return (
                  <div key={zone.name} className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{zone.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{zone.note}</p>
                    </div>
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-white"
                      style={{ background: d.color }}
                      title={d.label}
                    >
                      {zone.risk}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warning + source */}
          <div
            className="flex items-start gap-3 border rounded-lg p-4"
            style={{
              borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)',
              background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
            }}
          >
            <TriangleAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div className="text-sm">
              <p className="font-medium" style={{ color: 'var(--warning)' }}>Туристам и гидам</p>
              <p className="text-[var(--text-secondary)] mt-1">
                При движении в горной местности в зимне-весенний период: избегайте подветренных склонов крутизной 30–45°, карнизов и кулуаров.
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Официальный прогноз лавинной опасности: avalanche.ru
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Сейсмика ── */}
      {activeTab === 'seismic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Сейсмическая активность — Камчатка
            </h2>
            <button
              onClick={fetchSeismic}
              disabled={seismicLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--border)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${seismicLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          {seismicLoading && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)] animate-pulse" />
              <p className="text-sm text-[var(--text-muted)]">Загрузка данных USGS...</p>
            </div>
          )}

          {seismicError && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">{seismicError}</p>
            </div>
          )}

          {!seismicLoading && !seismicError && seismic.length === 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">Землетрясений M2.5+ за последние сутки не зафиксировано</p>
            </div>
          )}

          {!seismicLoading && seismic.length > 0 && (
            <>
              <div className="space-y-2">
                {seismic.map((ev) => (
                  <div key={ev.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                          style={{ background: magColor(ev.magnitude) }}
                        >
                          {ev.magnitude.toFixed(1)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{ev.place}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            Глубина: {Math.round(ev.depth)} км · {timeAgo(ev.time)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {seismicLastUpdate && (
                <p className="text-xs text-[var(--text-muted)] text-right">
                  Источник: USGS · {seismicLastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Погода ── */}
      {activeTab === 'weather' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Погода — Петропавловск-Камчатский
            </h2>
            <button
              onClick={() => { setWeather(null); fetchWeather(); }}
              disabled={weatherLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--border)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${weatherLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          {weatherLoading && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
              <Thermometer className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)] animate-pulse" />
              <p className="text-sm text-[var(--text-muted)]">Загрузка прогноза...</p>
            </div>
          )}

          {weatherError && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">{weatherError}</p>
            </div>
          )}

          {!weatherLoading && weather && (
            <>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-4xl font-bold text-[var(--text-primary)]">{weather.tempC}°C</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{weather.desc}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Ощущается как {weather.feelsLikeC}°C
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex items-center gap-3">
                  <Wind className="w-5 h-5 text-[var(--ocean)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Ветер</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{weather.windKmph} км/ч</p>
                  </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex items-center gap-3">
                  <Droplets className="w-5 h-5 text-[var(--ocean)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Влажность</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{weather.humidity}%</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)] text-right">Источник: wttr.in</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
