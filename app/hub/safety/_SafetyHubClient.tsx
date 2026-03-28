'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Truck, AlertTriangle, Thermometer, Wind, Droplets, Activity, Phone, RefreshCw, MountainSnow, TriangleAlert, User, Send, Bot, Flame } from 'lucide-react';

interface RescueMessage {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

// Локальные протоколы — работают без сети
const LOCAL_PROTOCOLS: [RegExp, string][] = [
  [/медвед|bear/i,        '1. Не беги\n2. Говори громко и спокойно\n3. Стань визуально больше (руки вверх)\n4. Медленно отступай, не поворачивайся спиной\n5. Атака — упади, притворись мёртвым, защити шею\n\nПозвоните: 112'],
  [/заблуд|потеря|lost/i, '1. СТОП — экономь силы\n2. Оставайся на месте\n3. 3 свистка подряд = сигнал бедствия\n4. На возвышенность для связи\n5. Ищи ручей — выведет к людям\n\nПозвоните: 112'],
  [/трав|кров|перелом|injury|wound/i, '1. Остановите кровь — прямое давление тканью\n2. Жгут выше раны если не останавливается (запишите время!)\n3. Перелом: иммобилизуйте подручным, не выравнивайте кость\n4. Позвоночник: НЕ двигать\n\nПозвоните: 112'],
  [/холод|замёрз|гипотерм|cold|freez/i, '1. Снять мокрое, укрыться от ветра\n2. Горячее сладкое питьё (не алкоголь!)\n3. В горизонтальное положение\n4. Тепло тела рядом — не давай заснуть\n\nПозвоните: 112'],
  [/земл|тряс|quake/i,   '1. Внутри: стол/проём, голову защитить\n2. Снаружи: от зданий/деревьев/ЛЭП, лечь\n3. После: проверить газ, не входить в повреждённые здания\n4. Цунами-угроза: немедленно на возвышение\n\nПозвоните: 112'],
  [/вулкан|пепел|volcano|ash/i, '1. Уйти перпендикулярно ветру\n2. Защитить дыхание: влажная ткань или респиратор\n3. Пирокластический поток: лечь в яму/канаву, закрыть тело\n\nПозвоните: 112'],
  [/связ|сигнал|signal|offline/i, '1. Подними телефон на возвышенность\n2. Зеркало или фольга → на вертолёт/самолёт\n3. 3 дымных костра в треугольнике = сигнал помощи\n4. Оставайся на месте — так найдут быстрее\n\nПозвоните: 112'],
];

function getLocalProtocol(text: string): string | null {
  for (const [pattern, response] of LOCAL_PROTOCOLS) {
    if (pattern.test(text)) return response;
  }
  return null;
}

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

interface VolcanicEvent {
  id: string;
  title: string;
  description: string | null;
  severity: number;
  affected_zones: string[];
  created_at: string;
  expires_at: string | null;
  source_url: string | null;
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
  const [touristName, setTouristName] = useState('');
  const [touristPhone, setTouristPhone] = useState('');

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Seismic
  const [seismic, setSeismic] = useState<SeismicEvent[]>([]);
  const [seismicLoading, setSeismicLoading] = useState(false);
  const [seismicError, setSeismicError] = useState<string | null>(null);
  const [seismicLastUpdate, setSeismicLastUpdate] = useState<Date | null>(null);

  // Volcanic
  const [volcanic, setVolcanic] = useState<VolcanicEvent[]>([]);
  const [volcanicLoading, setVolcanicLoading] = useState(false);
  const [volcanicError, setVolcanicError] = useState<string | null>(null);
  const [volcanicLastUpdate, setVolcanicLastUpdate] = useState<Date | null>(null);

  // Rescue chat
  const RESCUE_GREETING: RescueMessage = {
    role: 'assistant',
    content: 'Я здесь. Опишите ситуацию — где вы находитесь и что произошло? Я помогу шаг за шагом.\n\nЕсли есть угроза жизни — сначала позвоните 112.',
  };
  const [rescueMessages, setRescueMessages] = useState<RescueMessage[]>([RESCUE_GREETING]);
  const [rescueInput, setRescueInput] = useState('');
  const [rescueLoading, setRescueLoading] = useState(false);
  const rescueChatRef = useRef<HTMLDivElement>(null);

  // Тихий трекинг визита для Rescue агента
  useEffect(() => {
    fetch('/api/safety/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tab: 'sos' }) }).catch(() => {});
  }, []);

  // Pre-fill имени из профиля если авторизован
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((data: { success?: boolean; user?: { name?: string } } | null) => {
        if (data?.success && data.user?.name) {
          setTouristName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  // Passive geolocation on mount — enableHighAccuracy=true forces GPS over IP-based fallback
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setCoordsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCoordsLoading(false);
      },
      () => setCoordsLoading(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
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

  const fetchVolcanic = useCallback(() => {
    setVolcanicLoading(true);
    setVolcanicError(null);
    fetch('/api/safety/volcanic')
      .then((r) => r.json())
      .then((d: { events?: VolcanicEvent[]; error?: string }) => {
        if (d.error && !d.events?.length) { setVolcanicError(d.error); return; }
        setVolcanic(d.events || []);
        setVolcanicLastUpdate(new Date());
      })
      .catch(() => setVolcanicError('Не удалось загрузить данные о вулканах'))
      .finally(() => setVolcanicLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'volcanic' && volcanic.length === 0 && !volcanicLoading) fetchVolcanic();
  }, [activeTab, volcanic.length, volcanicLoading, fetchVolcanic]);

  const handleSOS = useCallback(async () => {
    setSosStatus('locating');
    setSosError(null);

    let latitude = coords?.lat;
    let longitude = coords?.lng;

    if (!latitude && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
          })
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
        body: JSON.stringify({
          latitude,
          longitude,
          emergency_type: 'general',
          tourist_name:  touristName.trim() || undefined,
          tourist_phone: touristPhone.trim() || undefined,
        }),
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

  const handleRescueSend = useCallback(async () => {
    const text = rescueInput.trim();
    if (!text || rescueLoading) return;

    const userMsg: RescueMessage = { role: 'user', content: text };
    setRescueMessages(prev => [...prev, userMsg]);
    setRescueInput('');
    setRescueLoading(true);

    setTimeout(() => {
      rescueChatRef.current?.scrollTo({ top: rescueChatRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);

    // Оффлайн-режим: локальный протокол без сети
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      const local = getLocalProtocol(text)
        ?? 'Нет связи. Позвоните: 112 | 8 (4152) 41-03-03 (ПАСС Камчатки)\n\n3 свистка подряд = сигнал бедствия.';
      setRescueMessages(prev => [...prev, { role: 'assistant', content: local }]);
      setRescueLoading(false);
      return;
    }

    try {
      const history = rescueMessages.filter((_, i) => i > 0).slice(-6);
      const res = await fetch('/api/safety/rescue-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          stream: true,
          tourist_name:  touristName.trim() || undefined,
          tourist_phone: touristPhone.trim() || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
        }),
        signal: AbortSignal.timeout(25_000),
      });

      const contentType = res.headers.get('content-type') ?? '';

      // ── STREAMING ──────────────────────────────────────────────
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        // Подготавливаем слот для ответа
        setRescueMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;
            try {
              const delta = (JSON.parse(raw) as { choices?: { delta?: { content?: string } }[] })
                ?.choices?.[0]?.delta?.content ?? '';
              accumulated += delta;
              setRescueMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.streaming) {
                  updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: true };
                }
                return updated;
              });
              if (delta) {
                rescueChatRef.current?.scrollTo({ top: rescueChatRef.current.scrollHeight, behavior: 'smooth' });
              }
            } catch { /* skip malformed chunk */ }
          }
        }

        // Финализируем — убираем флаг streaming
        setRescueMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.streaming) {
            updated[updated.length - 1] = { role: 'assistant', content: accumulated || 'Нет ответа.' };
          }
          return updated;
        });

      // ── NON-STREAMING FALLBACK ─────────────────────────────────
      } else {
        const data = await res.json() as { reply?: string; error?: string };
        setRescueMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply ?? data.error ?? 'Нет ответа. При угрозе — 112.',
        }]);
      }

    } catch {
      // Таймаут или сетевая ошибка — показываем локальный протокол
      const local = getLocalProtocol(text)
        ?? 'Нет связи. Позвоните: 112 | 8 (4152) 41-03-03 (ПАСС Камчатки)';
      setRescueMessages(prev => [...prev, { role: 'assistant', content: local }]);
    } finally {
      setRescueLoading(false);
      setTimeout(() => {
        rescueChatRef.current?.scrollTo({ top: rescueChatRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [rescueInput, rescueLoading, rescueMessages, touristName, touristPhone, coords]);

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
          { id: 'sos',      label: 'SOS' },
          { id: 'rescue',   label: 'AI Спасатель' },
          { id: 'emergency', label: 'МЧС' },
          { id: 'volcanic', label: 'Вулканы' },
          { id: 'avalanche', label: 'Лавины' },
          { id: 'seismic',  label: 'Сейсмика' },
          { id: 'weather',  label: 'Погода' },
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

            {/* Данные туриста — чтобы знать КТО */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-left">
              <div>
                <label className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-1">
                  <User className="w-3 h-3" />
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
                  <Phone className="w-3 h-3" />
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
              {!coordsLoading && coords && (() => {
                // Kamchatka bounding box: 50–62°N, 155–170°E
                const inKamchatka = coords.lat >= 50 && coords.lat <= 62 && coords.lng >= 155 && coords.lng <= 170;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-[var(--ocean)]" />
                      <span className="font-mono text-[var(--text-primary)]">
                        {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                      </span>
                      <button
                        onClick={() => {
                          setCoords(null);
                          setCoordsLoading(true);
                          navigator.geolocation.getCurrentPosition(
                            (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setCoordsLoading(false); },
                            () => setCoordsLoading(false),
                            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
                          );
                        }}
                        className="ml-auto text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        title="Обновить координаты"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {!inKamchatka && (
                      <p className="text-xs text-[var(--warning)] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        Координаты не соответствуют Камчатке. Разрешите точную геолокацию в браузере.
                      </p>
                    )}
                    {inKamchatka && (
                      <p className="text-xs text-[var(--text-muted)]">Координаты будут отправлены вместе с SOS</p>
                    )}
                  </div>
                );
              })()}
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

      {/* ── AI Спасатель ── */}
      {activeTab === 'rescue' && (
        <div className="space-y-4">

          {/* Стрип-предупреждение */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border"
            style={{ borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)', background: 'color-mix(in srgb, var(--warning) 8%, transparent)' }}>
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--warning)' }} />
            <p className="text-xs" style={{ color: 'var(--warning)' }}>
              AI Спасатель — поддержка и инструкции. При реальной угрозе жизни звоните <strong>112</strong> или <strong>8 (4152) 41-03-03</strong>
            </p>
          </div>

          {/* Чат */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg flex flex-col" style={{ height: '520px' }}>

            {/* Заголовок чата */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)' }}>
                <Bot className="w-5 h-5" style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">AI Спасатель</p>
                <p className="text-xs text-[var(--text-muted)]">Обучен стандартам МЧС России · Камчатка</p>
              </div>
            </div>

            {/* Сообщения */}
            <div ref={rescueChatRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {rescueMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                      style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)' }}>
                      <Bot className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                    </div>
                  )}
                  <div
                    className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={msg.role === 'assistant'
                      ? { background: 'var(--bg-hover)', color: 'var(--text-primary)', borderRadius: '4px 16px 16px 16px' }
                      : { background: 'var(--danger)', color: '#fff', borderRadius: '16px 4px 16px 16px' }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {rescueLoading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2"
                    style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)' }}>
                    <Bot className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                  </div>
                  <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: 'var(--bg-hover)', borderRadius: '4px 16px 16px 16px' }}>
                    <span className="flex gap-1 items-center text-[var(--text-muted)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Ввод */}
            <div className="px-4 py-3 border-t border-[var(--border)]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rescueInput}
                  onChange={e => setRescueInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleRescueSend(); } }}
                  placeholder="Опишите ситуацию..."
                  className="ds-input flex-1 text-sm"
                  disabled={rescueLoading}
                />
                <button
                  onClick={() => void handleRescueSend()}
                  disabled={rescueLoading || !rescueInput.trim()}
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
                  style={{ background: 'var(--danger)' }}
                  aria-label="Отправить"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Быстрые подсказки */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {['Встретил медведя', 'Заблудился', 'Травма', 'Непогода застала'].map(hint => (
                  <button
                    key={hint}
                    onClick={() => setRescueInput(hint)}
                    className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--danger)] transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
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

      {/* ── Вулканы ── */}
      {activeTab === 'volcanic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Вулканическая активность — Камчатка
            </h2>
            <button
              onClick={fetchVolcanic}
              disabled={volcanicLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--border)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${volcanicLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          {volcanicLoading && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
              <Flame className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)] animate-pulse" />
              <p className="text-sm text-[var(--text-muted)]">Загрузка данных КБГС РАН...</p>
            </div>
          )}

          {volcanicError && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">{volcanicError}</p>
            </div>
          )}

          {!volcanicLoading && !volcanicError && volcanic.length === 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 text-center">
              <Flame className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">Извержений за последние 7 дней не зафиксировано</p>
            </div>
          )}

          {!volcanicLoading && volcanic.length > 0 && (
            <div className="space-y-3">
              {volcanic.map((ev) => {
                const color = ev.severity >= 2
                  ? 'var(--danger)'
                  : ev.severity === 1
                    ? 'var(--warning)'
                    : 'var(--success)';
                const bg = ev.severity >= 2
                  ? 'color-mix(in srgb, var(--danger) 8%, transparent)'
                  : ev.severity === 1
                    ? 'color-mix(in srgb, var(--warning) 8%, transparent)'
                    : 'color-mix(in srgb, var(--success) 8%, transparent)';
                const label = ev.severity >= 2 ? 'Высокая' : ev.severity === 1 ? 'Умеренная' : 'Низкая';
                const dateStr = new Date(ev.created_at).toLocaleString('ru-RU', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div
                    key={ev.id}
                    className="border rounded-lg p-4"
                    style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: bg }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: `color-mix(in srgb, ${color} 20%, transparent)` }}
                      >
                        <Flame className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{ev.title}</p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                          >
                            {label}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{ev.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-[var(--text-muted)]">{dateStr}</span>
                          {ev.affected_zones?.length > 0 && (
                            <span className="text-xs text-[var(--text-muted)]">
                              Зоны: {ev.affected_zones.join(', ')}
                            </span>
                          )}
                          {ev.source_url && (
                            <a
                              href={ev.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--ocean)] hover:underline"
                            >
                              Источник
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {volcanicLastUpdate && (
                <p className="text-xs text-[var(--text-muted)] text-right">
                  Источник: КБГС РАН · {volcanicLastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}
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
