'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, MapPin, Mountain, AlertTriangle, Shield, Phone,
  Star, MessageSquare, Download, Navigation, Clock, Ruler,
  TrendingUp, Calendar, Users, ExternalLink, ChevronRight,
  FileText, Compass, TreePine, Bug,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { AssistantButton } from '@/components/shared/AssistantButton';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const ACTIVITY_LABELS: Record<string, string> = {
  trekking: 'Треккинг', fishing: 'Рыбалка', sup: 'SUP', thermal: 'Термальные',
  winter_hiking: 'Зимний поход', sightseeing: 'Осмотр', ski: 'Лыжи',
  ride: 'Снегоход', cultural: 'Культура',
};

const ZONE_LABELS: Record<string, string> = {
  avachinsky: 'Авачинский', nalychevo: 'Налычево', mutnovsky: 'Мутновский',
  klyuchevskoy: 'Ключевской', kronotsky: 'Кроноцкий', south: 'Южный',
};

const SEASON_LABELS: Record<string, string> = {
  summer: 'Июнь — Сентябрь', winter: 'Декабрь — Март', all: 'Круглый год',
};

const HAZARD_ICONS: Record<string, string> = {
  avalanche: '🏔', rockfall: '🪨', thermal: '🌋', altitude: '⛰',
  wildlife: '🐻', river_crossing: '🌊', fog: '🌫', ice: '🧊',
  volcanic_gas: '💨', steep: '📐', plants: '🌿',
};

const DIFFICULTY_LABELS = ['', 'Лёгкий', 'Ниже среднего', 'Средний', 'Сложный', 'Экстремальный'];
const DIFFICULTY_COLORS = ['', 'var(--success)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--danger)'];

interface Waypoint {
  position: number; isStart: boolean; isEnd: boolean; notes: string | null;
  placeId: string; placeName: string; locationType: string | null;
  lat: number | null; lng: number | null; altitudeM: number | null;
  hazardTypes: string[];
}

interface TourLink {
  id: number; title: string; basePrice: number | null;
  operatorName: string | null; operatorSlug: string | null;
}

interface Review {
  id: string; rating: number; comment: string | null;
  authorName: string; createdAt: string;
}

interface NearbyRoute {
  id: string; title: string; activityType: string | null; difficulty: string | null;
}

interface MchsData {
  required: boolean; phone: string | null; formUrl: string;
  parkName: string | null; parkApprovalUrl: string | null;
}

interface RouteData {
  id: string; title: string; description: string | null;
  category: string | null; activityType: string | null;
  zone: string | null; difficulty: string | null;
  lat: number | null; lng: number | null;
  sourceUrl: string | null; pdfUrl: string | null;
  season: string | null; routeType: string | null;
  hazards: string[]; equipment: string[];
  distanceKm: number | null; elevationGainM: number | null;
  durationHours: number | null; floraFauna: string | null;
  accessibility: string | null;
  geometry: { type: string; coordinates: [number, number][] } | null;
  mchs: MchsData;
  waypoints: Waypoint[]; tours: TourLink[];
  reviews: Review[]; nearby: NearbyRoute[];
}

function fmtDuration(h: number | null): string {
  if (!h) return '';
  if (h < 24) return `${h} ч`;
  const d = Math.round(h / 24);
  if (d === 1) return '1 день';
  if (d < 5) return `${d} дня`;
  return `${d} дней`;
}

export default function RouteCardClient({ id }: { id: string }) {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/routes/detail/${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setRoute(j.data); })
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

  if (!route) {
    return (
      <>
        <Header />
        <div className="ds-page pt-32 text-center space-y-4">
          <p className="text-[var(--text-secondary)]">Маршрут не найден</p>
          <Link href="/routes" className="ds-btn ds-btn-secondary">Назад к маршрутам</Link>
        </div>
      </>
    );
  }

  const actLabel = ACTIVITY_LABELS[route.activityType ?? ''] ?? route.activityType ?? 'Маршрут';
  const zoneLabel = ZONE_LABELS[route.zone ?? ''] ?? route.zone;
  const seasonLabel = SEASON_LABELS[route.season ?? ''] ?? route.season;
  const hasGeo = route.lat != null && route.lng != null;
  const hasGeometry = route.geometry?.coordinates && route.geometry.coordinates.length > 2;
  const descParagraphs = route.description?.split('\n').filter(p => p.trim()) ?? [];
  const isLongDesc = descParagraphs.length > 3 || (route.description?.length ?? 0) > 500;
  const diffIdx = route.difficulty ? (['easy', 'medium', 'hard'].indexOf(route.difficulty) + 1 || parseInt(route.difficulty) || 0) : 0;

  const mapMarkers = [
    ...(hasGeo ? [{
      coords: [route.lat!, route.lng!] as [number, number],
      title: route.title, description: 'Старт', color: 'red' as const,
      type: MarkerType.TOUR, category: route.activityType ?? 'other',
    }] : []),
    ...route.waypoints.filter(w => w.lat && w.lng).map(w => ({
      coords: [w.lat!, w.lng!] as [number, number],
      title: w.placeName, description: w.locationType ?? '',
      color: 'blue' as const, type: MarkerType.TOUR,
      category: w.locationType ?? 'other',
    })),
  ];

  return (
    <>
      <Header />

      {/* HERO — карта или градиент */}
      <div className="relative w-full overflow-hidden" style={{ height: '40vh', minHeight: 260, maxHeight: 400 }}>
        <div className="absolute inset-0 pt-16">
          {hasGeo ? (
            <LeafletMap
              center={[route.lat!, route.lng!]}
              zoom={hasGeometry ? 10 : 11}
              markers={mapMarkers}
              height="100%"
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--bg-hover)] to-[var(--bg-card)] flex items-center justify-center">
              <Compass className="w-20 h-20 text-[var(--text-muted)] opacity-30" />
            </div>
          )}
        </div>
        <div className="absolute top-20 left-4 z-[500]">
          <Link href="/routes"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-primary)] bg-[var(--bg-card)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
            <ArrowLeft className="w-3.5 h-3.5" /> Маршруты
          </Link>
        </div>
      </div>

      {/* TITLE */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest">Маршрут</span>
            <span className="text-[var(--text-muted)] text-xs">·</span>
            <span className="text-xs text-[var(--text-secondary)]">{actLabel}</span>
            {zoneLabel && (
              <>
                <span className="text-[var(--text-muted)] text-xs">·</span>
                <span className="text-xs text-[var(--text-secondary)]">{zoneLabel}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight"
            style={{ fontFamily: 'var(--font-playfair)' }}>
            {route.title}
          </h1>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 overflow-x-auto">
          <div className="flex items-stretch gap-0 divide-x divide-[var(--border)]">
            {route.distanceKm != null && (
              <div className="flex-shrink-0 px-3 py-2.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Дистанция</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1"><Ruler className="w-3 h-3 text-[var(--accent)]" /> {route.distanceKm} км</p>
              </div>
            )}
            {route.elevationGainM != null && (
              <div className="flex-shrink-0 px-3 py-2.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Набор высоты</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1"><TrendingUp className="w-3 h-3 text-[var(--accent)]" /> {route.elevationGainM} м</p>
              </div>
            )}
            {route.durationHours != null && (
              <div className="flex-shrink-0 px-3 py-2.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Время</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1"><Clock className="w-3 h-3 text-[var(--accent)]" /> {fmtDuration(route.durationHours)}</p>
              </div>
            )}
            {diffIdx > 0 && (
              <div className="flex-shrink-0 px-3 py-2.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Сложность</p>
                <p className="text-sm font-semibold" style={{ color: DIFFICULTY_COLORS[diffIdx] }}>{DIFFICULTY_LABELS[diffIdx]}</p>
              </div>
            )}
            {seasonLabel && (
              <div className="flex-shrink-0 px-3 py-2.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Сезон</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1"><Calendar className="w-3 h-3 text-[var(--accent)]" /> {seasonLabel}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 space-y-8">

        {/* DESCRIPTION */}
        {descParagraphs.length > 0 && (
          <section>
            <div className={`text-[var(--text-secondary)] leading-relaxed space-y-3 text-sm md:text-base overflow-hidden transition-all duration-300 ${isLongDesc && !descExpanded ? 'max-h-32' : 'max-h-none'}`}
              style={isLongDesc && !descExpanded ? { maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' } : undefined}>
              {descParagraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {isLongDesc && (
              <button onClick={() => setDescExpanded(v => !v)} className="mt-2 text-sm text-[var(--ocean)] font-medium">
                {descExpanded ? 'Свернуть' : 'Читать полностью'}
              </button>
            )}
          </section>
        )}

        {/* WAYPOINTS */}
        {route.waypoints.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" /> Точки маршрута
            </h2>
            <div className="relative">
              <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-[var(--border)]" />
              <div className="space-y-0">
                {route.waypoints.map((w, i) => (
                  <Link key={w.placeId} href={`/places/${w.placeId}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors relative">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 z-10">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{w.placeName}</p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                        {w.altitudeM && <span>{w.altitudeM} м</span>}
                        {w.notes && <span>{w.notes}</span>}
                        {w.hazardTypes.length > 0 && (
                          <span className="text-[var(--warning)]">
                            {w.hazardTypes.map(h => HAZARD_ICONS[h] ?? '⚠').join(' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* HAZARDS */}
        {route.hazards.length > 0 && (
          <section className="ds-card p-4 border-l-[3px] border-[var(--danger)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" /> Опасности
            </h2>
            <div className="space-y-2">
              {route.hazards.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-base">{HAZARD_ICONS[h] ?? '⚠'}</span>
                  <span className="text-[var(--text-secondary)]">{h}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MCHS + PREPARATION */}
        <section className="ds-card p-4 border-l-[3px] border-[var(--warning)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[var(--warning)]" /> Подготовка
          </h2>

          {route.mchs.required && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--warning)]/8 border border-[var(--warning)]/20">
              <p className="text-sm font-semibold text-[var(--warning)] mb-2">Регистрация в МЧС обязательна</p>
              <div className="space-y-1.5 text-sm">
                {route.mchs.phone && (
                  <a href={`tel:${route.mchs.phone.replace(/[^+\d]/g, '')}`}
                    className="flex items-center gap-1.5 text-[var(--ocean)] hover:text-[var(--accent)]">
                    <Phone className="w-3.5 h-3.5" /> {route.mchs.phone}
                  </a>
                )}
                <a href={route.mchs.formUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[var(--ocean)] hover:text-[var(--accent)]">
                  <FileText className="w-3.5 h-3.5" /> Онлайн-регистрация на сайте МЧС
                </a>
                <a href="tel:112" className="flex items-center gap-1.5 text-[var(--ocean)]">
                  <Phone className="w-3.5 h-3.5" /> 112 — экстренная помощь
                </a>
              </div>
              {route.mchs.parkName && (
                <div className="mt-2 pt-2 border-t border-[var(--warning)]/15">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Территория: {route.mchs.parkName}
                  </p>
                  {route.mchs.parkApprovalUrl && (
                    <a href={route.mchs.parkApprovalUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[var(--ocean)] hover:text-[var(--accent)] flex items-center gap-1 mt-1">
                      <ExternalLink className="w-3 h-3" /> Согласование маршрута с дирекцией парка
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {route.equipment.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Снаряжение</p>
              <div className="flex flex-wrap gap-1.5">
                {route.equipment.map((eq, i) => (
                  <span key={i} className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg">
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}

          {route.accessibility && (
            <p className="text-xs text-[var(--text-muted)] mt-3">{route.accessibility}</p>
          )}
        </section>

        {/* FLORA / FAUNA */}
        {route.floraFauna && (
          <section className="ds-card p-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <TreePine className="w-3.5 h-3.5 text-[var(--success)]" /> Флора и фауна
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{route.floraFauna}</p>
          </section>
        )}

        {/* DOWNLOAD */}
        <section className="flex gap-2">
          {route.pdfUrl && (
            <a href={route.pdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent)]/20 transition-colors">
              <FileText className="w-4 h-4" /> Паспорт (PDF)
            </a>
          )}
          {hasGeo && (
            <a href={`omaps://map?ll=${route.lng},${route.lat}&z=12`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 text-sm font-semibold hover:bg-green-500/20 transition-colors">
              <Navigation className="w-4 h-4" /> Organic Maps
            </a>
          )}
        </section>

        {/* KUZMICH */}
        <section className="ds-card p-5 border-l-[3px] border-[var(--accent)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/12 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">Кузьмич о маршруте</p>
              <p className="text-sm text-[var(--text-secondary)] italic mb-3">
                Спросите AI-консьержа о подготовке, погоде, снаряжении и безопасности на этом маршруте.
              </p>
              <a href={`https://t.me/KuzmichKam_bot?start=route_${route.id}`}
                target="_blank" rel="noopener noreferrer"
                className="ds-btn ds-btn-secondary text-xs inline-flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Спросить в Telegram
              </a>
            </div>
          </div>
        </section>

        {/* TOURS */}
        {route.tours.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">Туры по маршруту</h2>
            <div className="space-y-2">
              {route.tours.map(t => (
                <Link key={t.id} href={`/marketplace/tours/${t.id}`}
                  className="ds-card p-3 flex items-center justify-between hover:border-[var(--accent)] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{t.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{t.operatorName}</p>
                  </div>
                  {t.basePrice != null && (
                    <span className="text-sm font-bold text-[var(--accent)] whitespace-nowrap">
                      от {t.basePrice.toLocaleString('ru-RU')} ₽
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* REVIEWS */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-[var(--warning)]" /> Отзывы
          </h2>
          {route.reviews.length > 0 ? (
            <div className="space-y-3">
              {route.reviews.map(rv => (
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
                  {rv.comment && <p className="text-sm text-[var(--text-secondary)]">{rv.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="ds-card p-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">Отзывов пока нет</p>
            </div>
          )}
        </section>

        {/* NEARBY ROUTES */}
        {route.nearby.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">Похожие маршруты</h2>
            <div className="flex flex-wrap gap-2">
              {route.nearby.map(n => (
                <Link key={n.id} href={`/routes/detail/${n.id}`}
                  className="inline-flex items-center gap-1.5 text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] px-3 py-2 rounded-lg transition-colors">
                  <Compass className="w-3 h-3 text-[var(--accent)]" />
                  {n.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SOURCE */}
        {route.sourceUrl && (
          <a href={route.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--ocean)]">
            <ExternalLink className="w-3 h-3" /> Источник
          </a>
        )}
      </div>

      <AssistantButton pageContext={{ type: 'route', title: route.title, category: actLabel }} />
    </>
  );
}
