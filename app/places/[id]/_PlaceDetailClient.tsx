'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { PlaceData } from '@/components/places/types';

const PlaceHero            = dynamic(() => import('@/components/places/PlaceHero'),            { ssr: false });
const PlaceRealtimeStatus  = dynamic(() => import('@/components/places/PlaceRealtimeStatus'),  { ssr: false });
const PlaceDescription     = dynamic(() => import('@/components/places/PlaceDescription'),     { ssr: false });
const PlaceSafety          = dynamic(() => import('@/components/places/PlaceSafety'),          { ssr: false });
const PlaceAccess          = dynamic(() => import('@/components/places/PlaceAccess'),          { ssr: false });
const PlaceSeason          = dynamic(() => import('@/components/places/PlaceSeason'),          { ssr: false });
const PlaceRoutes          = dynamic(() => import('@/components/places/PlaceRoutes'),          { ssr: false });
const PlaceNearby          = dynamic(() => import('@/components/places/PlaceNearby'),          { ssr: false });
const PlaceFooter          = dynamic(() => import('@/components/places/PlaceFooter'),          { ssr: false });
const Header               = dynamic(() => import('@/components/layout/Header').then(m => ({ default: m.Header })), { ssr: false });

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full bg-[var(--bg-hover)]" style={{ height: 'clamp(280px, 60vh, 680px)' }} />
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-4">
        <div className="h-8 bg-[var(--bg-hover)] rounded w-2/3" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-full" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-5/6" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-4/6" />
      </div>
    </div>
  );
}

export default function PlaceDetailClient({ id }: { id: string }) {
  const [place, setPlace] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/places/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!cancelled) {
          if (j?.success && j.data) setPlace(j.data);
          else setError(j.error ?? 'Место не найдено');
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <><Header /><Skeleton /></>;

  if (error || !place) {
    return (
      <>
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <p className="text-[var(--text-secondary)] mb-4">{error ?? 'Место не найдено'}</p>
          <a href="/routes?kind=place" className="ds-btn ds-btn-secondary">← Все места</a>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      {/* Блок 1: Hero */}
      <PlaceHero
        placeId={place.id}
        name={place.name}
        locationType={place.locationType}
        lat={place.lat}
        lng={place.lng}
        photoUrl={place.photoUrl}
        photoCount={place.photoCount}
      />

      {/* Блок 2: Realtime status */}
      {place.realtime && <PlaceRealtimeStatus realtime={place.realtime} />}

      {/* Блоки 3–4: Заголовок + описание */}
      <PlaceDescription
        name={place.name}
        essence={place.essence}
        description={place.description}
        placeId={place.id}
      />

      {/* Блок 5: Безопасность */}
      <div className="mt-8">
        <PlaceSafety safety={place.safety} placeId={place.id} />
      </div>

      {/* Блок 6: Как добраться */}
      <div className="mt-8">
        <PlaceAccess
          placeId={place.id}
          name={place.name}
          lat={place.lat}
          lng={place.lng}
          accessInfo={place.accessInfo}
          nearbyMarkers={place.nearby}
        />
      </div>

      {/* Блок 7: Сезон */}
      {(place.safety.openFromDate || place.safety.openToDate || place.bestSeason || place.seasonalNotes) && (
        <div className="mt-8">
          <PlaceSeason
            openFromDate={place.safety.openFromDate}
            openToDate={place.safety.openToDate}
            bestSeason={place.bestSeason}
            seasonalNotes={place.seasonalNotes}
          />
        </div>
      )}

      {/* Блок 8: Маршруты */}
      <div className="mt-8">
        <PlaceRoutes routes={place.routes} placeId={place.id} />
      </div>

      {/* Блок 9: Места рядом */}
      <div className="mt-8">
        <PlaceNearby nearby={place.nearby} placeId={place.id} />
      </div>

      {/* Блок 10: Подвал */}
      <div className="mt-10">
        <PlaceFooter
          sourceUrl={place.sourceUrl}
          sourceName={place.sourceName}
          updatedAt={place.updatedAt}
        />
      </div>
    </>
  );
}
