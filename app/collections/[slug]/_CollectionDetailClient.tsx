'use client';

import Link from 'next/link';
import { MapPin, Route, Eye, ArrowLeft, Share2, Copy } from 'lucide-react';
import { useState } from 'react';

interface Place {
  id: string;
  name: string;
  location_type: string;
  lat: number;
  lng: number;
  description: string;
  image_url: string | null;
}

interface RouteItem {
  id: string;
  title: string;
  difficulty: string | null;
  distance_km: number | null;
  duration_hours: number | null;
  activity_type: string | null;
  description: string | null;
}

interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  tags: string[];
  view_count: number;
  places: Place[];
  routes: RouteItem[];
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Лёгкий',
  moderate: 'Средний',
  hard: 'Сложный',
  extreme: 'Экстрим',
};

const TYPE_LABELS: Record<string, string> = {
  volcano: 'Вулкан', lake: 'Озеро', hot_spring: 'Горячий источник',
  mountain: 'Гора', geyser: 'Гейзер', river: 'Река', beach: 'Пляж', forest: 'Лес', valley: 'Долина',
};

function PlaceCard({ place }: { place: Place }) {
  return (
    <Link href={`/places/${place.id}`} className="ds-card group block hover:shadow-md transition-all duration-200">
      {place.image_url ? (
        <img src={place.image_url} alt={place.name} className="w-full h-40 object-cover rounded-t-lg" />
      ) : (
        <div className="w-full h-40 rounded-t-lg bg-[var(--bg-hover)] flex items-center justify-center">
          <MapPin className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wide mb-1">
          {TYPE_LABELS[place.location_type] ?? place.location_type}
        </p>
        <h3 className="font-playfair font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
          {place.name}
        </h3>
        {place.description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{place.description}</p>
        )}
      </div>
    </Link>
  );
}

function RouteCard({ route }: { route: RouteItem }) {
  return (
    <Link href={`/routes/${route.id}`} className="ds-card group block hover:shadow-md transition-all duration-200 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-playfair font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
          {route.title}
        </h3>
        {route.difficulty && (
          <span className="ds-badge text-xs shrink-0">{DIFFICULTY_LABELS[route.difficulty] ?? route.difficulty}</span>
        )}
      </div>
      <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
        {route.distance_km && <span>{route.distance_km} км</span>}
        {route.duration_hours && <span>{route.duration_hours} ч</span>}
        {route.activity_type && <span>{route.activity_type}</span>}
      </div>
      {route.description && (
        <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">{route.description}</p>
      )}
    </Link>
  );
}

export function CollectionDetailClient({ collection }: { collection: Collection }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalItems = collection.places.length + collection.routes.length;

  return (
    <main className="ds-page min-h-screen pb-16">
      {collection.cover_image && (
        <div className="w-full h-64 md:h-80 relative overflow-hidden">
          <img src={collection.cover_image} alt={collection.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pt-8">
        <Link
          href="/collections"
          className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent)] text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Все подборки
        </Link>

        <header className="mb-8">
          <div className="flex flex-wrap gap-1 mb-3">
            {collection.tags.map(tag => (
              <span key={tag} className="ds-badge text-xs">{tag}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="ds-h1 mb-2">{collection.title}</h1>
              {collection.description && (
                <p className="text-[var(--text-secondary)] text-lg">{collection.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {collection.view_count.toLocaleString('ru')}</span>
                <span>{totalItems} объектов</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="ds-btn ds-btn-secondary flex items-center gap-2 text-sm"
              >
                {copied ? <><Copy className="w-4 h-4" /> Скопировано</> : <><Share2 className="w-4 h-4" /> Поделиться</>}
              </button>
            </div>
          </div>
        </header>

        {collection.places.length > 0 && (
          <section className="mb-10">
            <h2 className="ds-h2 flex items-center gap-2 mb-5">
              <MapPin className="w-5 h-5 text-[var(--accent)]" />
              Места <span className="text-[var(--text-muted)] font-normal text-base">({collection.places.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collection.places.map(p => <PlaceCard key={p.id} place={p} />)}
            </div>
          </section>
        )}

        {collection.routes.length > 0 && (
          <section className="mb-10">
            <h2 className="ds-h2 flex items-center gap-2 mb-5">
              <Route className="w-5 h-5 text-[var(--accent)]" />
              Маршруты <span className="text-[var(--text-muted)] font-normal text-base">({collection.routes.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {collection.routes.map(r => <RouteCard key={r.id} route={r} />)}
            </div>
          </section>
        )}

        {totalItems === 0 && (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p>Объекты этой подборки скоро появятся</p>
          </div>
        )}

        <div className="mt-12 p-6 ds-card text-center">
          <h3 className="font-playfair text-xl font-bold text-[var(--text-primary)] mb-2">
            Спланируйте своё путешествие
          </h3>
          <p className="text-[var(--text-secondary)] mb-4">
            Добавьте места из этой подборки в свой маршрут
          </p>
          <Link href="/planner" className="ds-btn ds-btn-primary">
            Открыть планировщик
          </Link>
        </div>
      </div>
    </main>
  );
}
