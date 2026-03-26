'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Truck, AlertTriangle, Thermometer, Wind, Droplets, Activity, Phone, RefreshCw, Bot, Send } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface WeatherData {
  tempC: string;
  feelsLikeC: string;
  desc: string;
  humidity: string;
  windKmph: string;
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

  // Rescue chat
  const [rescueMessages, setRescueMessages] = useState<ChatMessage[]>([]);
  const [rescueInput, setRescueInput] = useState('');
  const [rescueSending, setRescueSending] = useState(false);
  const rescueChatRef = React.useRef<HTMLDivElement>(null);

  // Seismic
  const [seismic, setSeismic] = useState<SeismicEvent[]>([]);
  const [seismicLoading, setSeismicLoading] = useState(false);
  const [seismicError, setSeismicError] = useState<string | null>(null);
  const [seismicLastUpdate, setSeismicLastUpdate] = useState<Date | null>(null);

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
    fetch('https://wttr.in/Petropavlovsk-Kamchatsky?format=j1')
      .then((r) => r.json())
      .then((d) => {
        const cur = d.current_condition?.[0];
        if (!cur) { setWeatherError('Нет данных от сервера погоды'); return; }
        setWeather({
          tempC: cur.temp_C,
          feelsLikeC: cur.FeelsLikeC,
          desc: cur.lang_ru?.[0]?.value || cur.weatherDesc?.[0]?.value || '—',
          humidity: cur.humidity,
          windKmph: cur.windspeedKmph,
        });
      })
      .catch(() => setWeatherError('Не удалось загрузить прогноз погоды'))
      .finally(() => setWeatherLoading(false));
  }, []);

  const fetchSeismic = useCallback(() => {
    setSeismicLoading(true);
    setSeismicError(null);
    const url =
      'https://earthquake.usgs.gov/fdsnws/event/1/query' +
      '?format=geojson&minlatitude=50&maxlatitude=63&minlongitude=155&maxlongitude=165' +
      '&minmagnitude=2.5&limit=10&orderby=time';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const events: SeismicEvent[] = (d.features || []).map((f: {
          id: string;
          properties: { mag: number; place: string; time: number };
          geometry: { coordinates: [number, number, number] };
        }) => ({
          id: f.id,
          magnitude: f.properties.mag,
          place: f.properties.place,
          time: f.properties.time,
          depth: f.geometry.coordinates[2],
        }));
        setSeismic(events);
        setSeismicLastUpdate(new Date());
      })
      .catch(() => setSeismicError('Не удалось загрузить данные USGS Earthquake'))
      .finally(() => setSeismicLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'weather' && !weather && !weatherLoading) fetchWeather();
  }, [activeTab, weather, weatherLoading, fetchWeather]);

  useEffect(() => {
    if (activeTab === 'seismic' && seismic.length === 0 && !seismicLoading) fetchSeismic();
  }, [activeTab, seismic.length, seismicLoading, fetchSeismic]);

  const handleRescueChat = useCallback(async () => {
    const text = rescueInput.trim();
    if (!text || rescueSending) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    setRescueMessages((prev) => [...prev, userMsg]);
    setRescueInput('');
    setRescueSending(true);
    try {
      const res = await fetch('/api/safety/rescue-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: rescueMessages.slice(-10),
        }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply || data.error || 'Нет ответа',
      };
      setRescueMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setRescueMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ошибка соединения. При угрозе жизни звоните 112.' },
      ]);
    } finally {
      setRescueSending(false);
    }
  }, [rescueInput, rescueSending, rescueMessages]);

  // Auto-scroll rescue chat
  React.useEffect(() => {
    if (rescueChatRef.current) {
      rescueChatRef.current.scrollTop = rescueChatRef.current.scrollHeight;
    }
  }, [rescueMessages]);

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
          { id: 'seismic', label: 'Сейсмика' },
          { id: 'weather', label: 'Погода' },
          { id: 'ai', label: 'AI Спасатель' },
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
          {/* Send SOS */}
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
            {/* Emergency numbers */}
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

            {/* Location */}
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
                <li>Проверьте прогноз погоды на <span className="text-[var(--ocean)]">pogoda.ksc.ru</span></li>
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

      {/* ── AI Спасатель ── */}
      {activeTab === 'ai' && (
        <div className="flex flex-col" style={{ height: '60vh', minHeight: 420 }}>
          {/* Header */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 mb-3 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)' }}
            >
              <Bot className="w-5 h-5" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">AI Спасатель</p>
              <p className="text-xs text-[var(--text-muted)]">Консультации по безопасности · При угрозе жизни звоните 112</p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={rescueChatRef}
            className="flex-1 overflow-y-auto space-y-3 pr-1"
          >
            {rescueMessages.length === 0 && (
              <div className="text-center py-10 text-[var(--text-muted)]">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Задайте вопрос о безопасности на Камчатке</p>
                <div className="mt-4 flex flex-col gap-2 items-center">
                  {[
                    'Что делать при встрече с медведем?',
                    'Как действовать при землетрясении?',
                    'Что взять с собой в горы?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setRescueInput(q)}
                      className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {rescueMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'text-white rounded-br-none'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-none'
                  }`}
                  style={msg.role === 'user' ? { background: 'var(--accent)' } : {}}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {rescueSending && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg rounded-bl-none px-4 py-2.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={rescueInput}
              onChange={(e) => setRescueInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleRescueChat(); } }}
              placeholder="Спросите AI Спасателя..."
              className="ds-input flex-1 text-sm"
              disabled={rescueSending}
            />
            <button
              onClick={() => void handleRescueChat()}
              disabled={rescueSending || !rescueInput.trim()}
              className="px-4 py-2 rounded-lg font-medium text-sm text-white disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
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
