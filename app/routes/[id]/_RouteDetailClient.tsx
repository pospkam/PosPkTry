'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Tag, Clock, Calendar, Mountain,
  ExternalLink, AlertTriangle, Users, Gauge, Send,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import LeadModal from '@/components/routes/LeadModal';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const CATEGORY_LABELS: Record<string, string> = {
  vulkani:              'Вулканы',
  termalnye_istochniki: 'Термальные источники',
  morskie_progulki:     'Морские прогулки',
  eco:                  'Экомаршруты',
  rybalka:              'Рыбалка',
  snegohod:             'Снегоходы',
  vertoletnye_tury:     'Вертолётные туры',
  trekking:             'Трекинг',
  geyzery:              'Гейзеры',
  rivers:               'Реки',
  lakes:                'Озёра',
  medvedi:              'Медведи',
  mountains:            'Горы',
  dzhip:                'Джип-туры',
};

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

interface RouteDetail {
  id: string;
  category: string;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  sourceUrl: string | null;
  sourceName: string | null;
  priceFrom: number | null;
  season: string | null;
  difficulty: string | null;
  durationDays: number | null;
  bestMonths: number[] | null;
  altitude: number | null;
  groupSizeMax: number | null;
  dangerLevel: string | null;
  equipment: string[] | null;
}

export default function RouteDetailClient({ id }: { id: string }) {
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showLead, setShowLead] = useState(false);

  useEffect(() => {
    fetch(`/api/routes/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setRoute(j.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="ds-page pt-20 pb-10">
          <div className="ds-skeleton rounded-lg h-8 w-64 mb-4" />
          <div className="ds-skeleton rounded-lg h-48 mb-4" />
          <div className="ds-skeleton rounded-lg h-64" />
        </div>
      </>
    );
  }

  if (notFound || !route) {
    return (
      <>
        <Header />
        <div className="ds-page pt-20 py-20 text-center">
          <p className="text-[var(--text-secondary)] mb-4">Маршрут не найден</p>
          <Link href="/routes" className="ds-btn ds-btn-secondary">Назад к каталогу</Link>
        </div>
      </>
    );
  }

  const hasGeo = route.lat != null && route.lng != null;
  const catLabel = CATEGORY_LABELS[route.category] ?? route.category;

  return (
    <>
      <Header />
      <div className="ds-page pt-20 pb-10">

      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <Link
        href="/routes"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Все маршруты
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Main content ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Title */}
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--accent)] mb-2 block">
              {catLabel}
            </span>
            <h1 className="ds-h1">{route.title}</h1>
          </div>

          {/* Key badges */}
          <div className="flex flex-wrap gap-2">
            {route.priceFrom != null && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] text-sm font-semibold">
                <Tag className="w-3.5 h-3.5" />
                от {route.priceFrom.toLocaleString('ru-RU')} ₽
              </span>
            )}
            {route.durationDays != null && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <Clock className="w-3.5 h-3.5" />
                {route.durationDays} дн.
              </span>
            )}
            {route.difficulty && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <Gauge className="w-3.5 h-3.5" />
                {route.difficulty}
              </span>
            )}
            {route.altitude != null && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <Mountain className="w-3.5 h-3.5" />
                {route.altitude.toLocaleString('ru-RU')} м
              </span>
            )}
            {route.groupSizeMax != null && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <Users className="w-3.5 h-3.5" />
                до {route.groupSizeMax} чел.
              </span>
            )}
            {hasGeo && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ocean)]/10 text-[var(--ocean)] text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {Number(route.lat).toFixed(4)}, {Number(route.lng).toFixed(4)}
              </span>
            )}
          </div>

          {/* Description */}
          {route.description && (
            <div className="prose prose-sm max-w-none text-[var(--text-secondary)] leading-relaxed">
              {route.description.split('\n').map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
            </div>
          )}

          {/* Best months */}
          {route.bestMonths && route.bestMonths.length > 0 && (
            <div>
              <h3 className="ds-label flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5" /> Лучшие месяцы
              </h3>
              <div className="flex gap-1.5 flex-wrap">
                {MONTHS.map((m, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      route.bestMonths!.includes(i + 1)
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                    }`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {route.equipment && route.equipment.length > 0 && (
            <div>
              <h3 className="ds-label mb-2">Необходимое снаряжение</h3>
              <ul className="flex flex-wrap gap-2">
                {route.equipment.map((eq, i) => (
                  <li key={i} className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2 py-1 rounded">
                    {eq}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Danger warning */}
          {route.dangerLevel === 'high' || route.dangerLevel === 'extreme' ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20">
              <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--warning)]">
                Маршрут повышенной сложности. Требует физической подготовки и опытного гида.
              </p>
            </div>
          ) : null}

          {/* Source link */}
          {route.sourceUrl && (
            <a
              href={route.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--ocean)] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Источник: {route.sourceName ?? new URL(route.sourceUrl).hostname}
            </a>
          )}
        </div>

        {/* ── Sidebar ───────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Map */}
          {hasGeo ? (
            <div>
              <h3 className="ds-label mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Расположение
              </h3>
              <LeafletMap
                center={[Number(route.lat), Number(route.lng)]}
                zoom={10}
                markers={[{
                  coords: [Number(route.lat), Number(route.lng)],
                  title: route.title,
                  description: catLabel,
                  color: 'red',
                }]}
                height="280px"
                className="w-full rounded-lg"
              />
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">Координаты уточняются</p>
            </div>
          )}

          {/* CTA */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Хотите на этот маршрут?</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Оставьте заявку — подберём оператора и дату под ваш запрос.
            </p>
            <Link
              href={`/search?q=${encodeURIComponent(route.title)}`}
              className="ds-btn ds-btn-secondary w-full text-center text-sm"
            >
              Найти тур
            </Link>
            <button
              type="button"
              onClick={() => setShowLead(true)}
              className="ds-btn ds-btn-primary w-full text-center text-sm flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Оставить заявку
            </button>
          </div>
        </div>
      </div>
    </div>
    <LeadModal
      open={showLead}
      onClose={() => setShowLead(false)}
      routeId={route.id}
      routeTitle={route.title}
    />
    </>
  );
}
