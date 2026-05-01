'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, MapPin, Mountain, AlertTriangle, Shield,
  Phone, Star, MessageSquare, ChevronLeft, ChevronRight,
  Download, Navigation, Thermometer, Droplets, Wind,
  Eye, Users, Calendar, ExternalLink, Compass,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { AssistantButton } from '@/components/shared/AssistantButton';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const LOCATION_TYPE_LABELS: Record<string, string> = {
  volcano: 'Вулкан', geyser: 'Гейзерное поле', hot_spring: 'Термальный источник',
  lake: 'Озеро', mountain: 'Горный массив', river: 'Река', bay: 'Бухта',
  cape: 'Мыс', island: 'Остров', forest: 'Лес и природный парк',
  beach: 'Пляж', waterfall: 'Водопад', rock: 'Скала',
  viewpoint: 'Смотровая площадка', settlement: 'Населённый пункт',
  museum: 'Музей', historical: 'Историческое место', other: 'Место',
};

const HAZARD_LABELS: Record<string, string> = {
  avalanche: 'Лавины', rockfall: 'Камнепад', thermal: 'Термальные зоны',
  altitude: 'Высота', wildlife: 'Дикие животные', river_crossing: 'Переправы',
  fog: 'Туман', ice: 'Лёд', volcanic_gas: 'Вулканические газы',
};

const TERRAIN_LABELS: Record<string, string> = {
  mountain: 'Горный', forest: 'Лесной', coastal: 'Прибрежный',
  tundra: 'Тундра', volcanic: 'Вулканический', river: 'Речной',
  swamp: 'Болотистый', alpine: 'Альпийский',
};

const DIFFICULTY_LABELS = ['', 'Лёгкий', 'Ниже среднего', 'Средний', 'Сложный', 'Экстремальный'];
const DIFFICULTY_COLORS = ['', 'var(--success)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--danger)'];

interface SafetyData {
  difficultyLevel: number | null;
  altitudeM: number | null;
  altitudeDiffM: number | null;
  distanceKm: number | null;
  terrainType: string | null;
  roadType: string | null;
  roadAccessibility: number | null;
  nearestMedicalKm: number | null;
  emergencyAccess: string | null;
  phoneRangerMches: string | null;
  satCommunicatorRequired: boolean;
  rulesRequired: string | null;
  weatherThreshold: Record<string, unknown> | null;
  hazardTypes: string[];
  capacityPerDay: number | null;
  openFromDate: string | null;
  openToDate: string | null;
}

interface RealtimeData {
  isOpen: boolean | null;
  currentCrowds: number | null;
  currentWeather: string | null;
  activeAlerts: string[] | null;
  alertSeverity: number | null;
  alertMessage: string | null;
  touristsToday: number | null;
  touristsHour: number | null;
}

interface NearbyPlace {
  id: string;
  name: string;
  locationType: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
}

interface RouteLink {
  id: string;
  title: string;
  activityType: string | null;
  difficulty: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  createdAt: string;
}

interface PlaceData {
  id: string;
  name: string;
  description: string;
  category: string | null;
  locationType: string | null;
  activityType: string | null;
  lat: number;
  lng: number;
  zone: string | null;
  photoCount: number;
  sourceUrl: string | null;
  sourceName: string | null;
  safety: SafetyData;
  realtime: RealtimeData;
  routes: RouteLink[];
  reviews: Review[];
  nearby: NearbyPlace[];
}

function crowdsLabel(n: number | null): string {
  if (n == null || n === 0) return 'Свободно';
  if (n <= 5) return 'Немного людей';
  if (n <= 15) return 'Умеренно';
  return 'Много людей';
}

export default function PlaceDetailClient({ id }: { id: string }) {
  const [place, setPlace] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/places/${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setPlace(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="ds-page pt-20 pb-10 space-y-3">
          <div className="ds-skeleton rounded h-56 w-full" />
          <div className="ds-skeleton rounded h-6 w-2/3" />
          <div className="ds-skeleton rounded h-4 w-1/2" />
        </div>
      </>
    );
  }

  if (!place) {
    return (
      <>
        <Header />
        <div className="ds-page pt-32 text-center space-y-4">
          <p className="text-[var(--text-secondary)]">Место не найдено</p>
          <Link href="/map" className="ds-btn ds-btn-secondary">Назад к карте</Link>
        </div>
      </>
    );
  }

  const locLabel = LOCATION_TYPE_LABELS[place.locationType ?? 'other'] ?? 'Место';
  const aiImageUrl = `/api/images/route/${place.id}`;
  const hasPhoto = place.photoCount > 0;
  const diffLevel = place.safety.difficultyLevel;
  const descParagraphs = place.description?.split('\n').filter(p => p.trim()) ?? [];
  const isLongDesc = descParagraphs.length > 3 || place.description.length > 500;

  return (
    <>
      <Header />

      {/* HERO */}
      <div className="relative w-full overflow-hidden" style={{ height: '44vh', minHeight: 280, maxHeight: 440 }}>
        <div className="absolute inset-0 pt-16">
          {hasPhoto ? (
            <Image src={aiImageUrl} alt={place.name} fill className="object-cover" priority sizes="100vw" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--bg-hover)] to-[var(--bg-card)] flex items-center justify-center">
              <Mountain className="w-20 h-20 text-[var(--text-muted)] opacity-30" />
            </div>
          )}
        </div>
        <div className="absolute top-20 left-4">
          <Link href="/map"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-primary)] bg-[var(--bg-card)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
            <ArrowLeft className="w-3.5 h-3.5" /> Карта
          </Link>
        </div>
      </div>

      {/* TITLE */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest">
              {locLabel}
            </span>
            {place.safety.altitudeM != null && place.safety.altitudeM > 0 && (
              <>
                <span className="text-[var(--text-muted)] text-xs">·</span>
                <span className="text-xs text-[var(--text-secondary)]">{place.safety.altitudeM.toLocaleString('ru-RU')} м</span>
              </>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight"
            style={{ fontFamily: 'var(--font-playfair)' }}>
            {place.name}
          </h1>
          <button
            onClick={() => navigator.clipboard?.writeText(`${place.lat}, ${place.lng}`)}
            className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--ocean)] transition-colors flex items-center gap-1"
          >
            <Compass className="w-3 h-3" />
            {place.lat.toFixed(4)}°N, {place.lng.toFixed(4)}°E
          </button>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-4 overflow-x-auto text-sm">
          {place.realtime.isOpen != null && (
            <span className={`flex items-center gap-1.5 font-semibold ${place.realtime.isOpen ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              <span className={`w-2 h-2 rounded-full ${place.realtime.isOpen ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
              {place.realtime.isOpen ? 'Открыто' : 'Закрыто'}
            </span>
          )}
          <span className="text-[var(--text-secondary)]">
            {crowdsLabel(place.realtime.currentCrowds)}
          </span>
          {diffLevel != null && diffLevel > 0 && (
            <span className="font-semibold" style={{ color: DIFFICULTY_COLORS[diffLevel] }}>
              {DIFFICULTY_LABELS[diffLevel]}
            </span>
          )}
          {place.safety.capacityPerDay != null && (
            <span className="text-[var(--text-muted)] flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {place.safety.capacityPerDay}/день
            </span>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 space-y-8">

        {/* DESCRIPTION */}
        <section>
          <div
            className={`text-[var(--text-secondary)] leading-relaxed space-y-3 text-sm md:text-base overflow-hidden transition-all duration-300 ${
              isLongDesc && !descExpanded ? 'max-h-32' : 'max-h-none'
            }`}
            style={isLongDesc && !descExpanded ? { maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' } : undefined}
          >
            {descParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {isLongDesc && (
            <button onClick={() => setDescExpanded(v => !v)}
              className="mt-2 text-sm text-[var(--ocean)] hover:text-[var(--accent)] font-medium">
              {descExpanded ? 'Свернуть' : 'Читать полностью'}
            </button>
          )}
        </section>

        {/* CHARACTERISTICS */}
        <section className="ds-card p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Mountain className="w-3.5 h-3.5 text-[var(--accent)]" /> Характеристики
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {place.locationType && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Тип</p>
                <p className="font-medium text-[var(--text-primary)]">{locLabel}</p>
              </div>
            )}
            {place.safety.altitudeM != null && place.safety.altitudeM > 0 && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Высота</p>
                <p className="font-medium text-[var(--text-primary)]">{place.safety.altitudeM.toLocaleString('ru-RU')} м</p>
              </div>
            )}
            {place.safety.terrainType && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Рельеф</p>
                <p className="font-medium text-[var(--text-primary)]">{TERRAIN_LABELS[place.safety.terrainType] ?? place.safety.terrainType}</p>
              </div>
            )}
            {place.safety.capacityPerDay != null && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Вместимость</p>
                <p className="font-medium text-[var(--text-primary)]">{place.safety.capacityPerDay} чел/день</p>
              </div>
            )}
            {(place.safety.openFromDate || place.safety.openToDate) && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Сезон</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {place.safety.openFromDate && place.safety.openToDate
                    ? `${new Date(place.safety.openFromDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${new Date(place.safety.openToDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
                    : 'Круглый год'}
                </p>
              </div>
            )}
            {place.safety.distanceKm != null && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Протяжённость</p>
                <p className="font-medium text-[var(--text-primary)]">{place.safety.distanceKm} км</p>
              </div>
            )}
          </div>
        </section>

        {/* SAFETY */}
        <section className="ds-card p-4 border-l-[3px] border-[var(--warning)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[var(--warning)]" /> Что знать
          </h2>

          {place.safety.hazardTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {place.safety.hazardTypes.map(h => (
                <span key={h} className="inline-flex items-center gap-1 text-xs bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/25 px-2 py-1 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  {HAZARD_LABELS[h] ?? h}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {place.safety.nearestMedicalKm != null && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] w-36 flex-shrink-0">До медпомощи</span>
                <span className="font-medium text-[var(--text-primary)]">{place.safety.nearestMedicalKm} км</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] w-36 flex-shrink-0">Спутниковая связь</span>
              <span className="font-medium text-[var(--text-primary)]">
                {place.safety.satCommunicatorRequired ? 'Требуется' : 'Не требуется'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--text-muted)] w-36 flex-shrink-0">Экстренные</span>
              <div className="space-y-1">
                <a href="tel:112" className="flex items-center gap-1 text-[var(--ocean)] hover:text-[var(--accent)]">
                  <Phone className="w-3 h-3" /> 112
                </a>
                <a href="tel:+74152235362" className="flex items-center gap-1 text-[var(--ocean)] hover:text-[var(--accent)]">
                  <Phone className="w-3 h-3" /> МЧС Камчатка
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ROUTES */}
        {place.routes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[var(--accent)]" /> Маршруты
            </h2>
            <div className="space-y-2">
              {place.routes.map(r => (
                <Link key={r.id} href={`/routes/${r.id}`}
                  className="ds-card p-3 flex items-center justify-between hover:border-[var(--accent)] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{r.title}</p>
                    {r.difficulty && (
                      <p className="text-xs text-[var(--text-muted)]">{r.difficulty}</p>
                    )}
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[var(--text-muted)] rotate-180" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* MAP */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" /> На карте
          </h2>
          <LeafletMap
            center={[place.lat, place.lng]}
            zoom={11}
            markers={[
              {
                coords: [place.lat, place.lng],
                title: place.name,
                description: locLabel,
                color: 'red',
                type: MarkerType.TOUR,
                category: place.locationType ?? 'other',
              },
              ...place.nearby.map(n => ({
                coords: [n.lat, n.lng] as [number, number],
                title: n.name,
                description: LOCATION_TYPE_LABELS[n.locationType ?? 'other'] ?? '',
                color: 'blue' as const,
                type: MarkerType.TOUR,
                category: n.locationType ?? 'other',
              })),
            ]}
            height="280px"
            className="w-full rounded-lg"
          />
          <div className="flex gap-2 mt-3">
            <a href={`omaps://map?ll=${place.lng},${place.lat}&z=12`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 text-sm font-semibold hover:bg-green-500/20 transition-colors">
              <Navigation className="w-4 h-4" /> Organic Maps
            </a>
            <a href={`/api/routes/${place.id}/export?format=gpx`} download
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent)]/20 transition-colors">
              <Download className="w-4 h-4" /> Офлайн
            </a>
          </div>
        </section>

        {/* KUZMICH */}
        <section className="ds-card p-5 border-l-[3px] border-[var(--accent)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/12 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">
                Кузьмич о месте
              </p>
              <p className="text-sm text-[var(--text-secondary)] italic mb-3">
                Спросите AI-консьержа о безопасности, сезонах, снаряжении и особенностях этого места.
              </p>
              <a href={`https://t.me/KuzmichKam_bot?start=place_${place.id}`}
                target="_blank" rel="noopener noreferrer"
                className="ds-btn ds-btn-secondary text-xs inline-flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Спросить в Telegram
              </a>
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-[var(--warning)]" /> Отзывы
          </h2>
          {place.reviews.length > 0 ? (
            <div className="space-y-3">
              {place.reviews.map(rv => (
                <div key={rv.id} className="ds-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < rv.rating ? 'fill-[var(--warning)] text-[var(--warning)]' : 'text-[var(--border)]'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{rv.authorName}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(rv.createdAt).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {rv.comment && (
                    <p className="text-sm text-[var(--text-secondary)]">{rv.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="ds-card p-6 text-center">
              <p className="text-sm text-[var(--text-muted)] mb-3">Отзывов пока нет</p>
              <p className="text-xs text-[var(--text-muted)]">Были здесь? Поделитесь впечатлениями</p>
            </div>
          )}
        </section>

        {/* NEARBY */}
        {place.nearby.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">
              Рядом
            </h2>
            <div className="flex flex-wrap gap-2">
              {place.nearby.map(n => (
                <Link key={n.id} href={`/places/${n.id}`}
                  className="inline-flex items-center gap-1.5 text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] px-3 py-2 rounded-lg transition-colors">
                  <MapPin className="w-3 h-3 text-[var(--accent)]" />
                  {n.name}
                  <span className="text-[var(--text-muted)]">{n.distanceKm} км</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SOURCE */}
        {place.sourceUrl && (
          <a href={place.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--ocean)] transition-colors">
            <ExternalLink className="w-3 h-3" />
            Источник: {place.sourceName ?? 'ссылка'}
          </a>
        )}
      </div>

      <AssistantButton pageContext={{ type: 'place', title: place.name, category: locLabel }} />
    </>
  );
}
