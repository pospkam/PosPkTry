'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { PlaceData } from '@/components/places/types';

const PlaceHero             = dynamic(() => import('@/components/places/PlaceHero'),             { ssr: false });
const PlaceRealtimeStatus   = dynamic(() => import('@/components/places/PlaceRealtimeStatus'),   { ssr: false });
const PlaceDescription      = dynamic(() => import('@/components/places/PlaceDescription'),      { ssr: false });
const PlaceCharacteristics  = dynamic(() => import('@/components/places/PlaceCharacteristics'),  { ssr: false });
const PlaceSafety           = dynamic(() => import('@/components/places/PlaceSafety'),           { ssr: false });
const PlaceAccess           = dynamic(() => import('@/components/places/PlaceAccess'),           { ssr: false });
const PlaceSeason           = dynamic(() => import('@/components/places/PlaceSeason'),           { ssr: false });
const PlaceRoutes           = dynamic(() => import('@/components/places/PlaceRoutes'),           { ssr: false });
const PlaceTours            = dynamic(() => import('@/components/places/PlaceTours'),            { ssr: false });
const PlaceKuzmich          = dynamic(() => import('@/components/places/PlaceKuzmich'),          { ssr: false });
const PlaceReviews          = dynamic(() => import('@/components/places/PlaceReviews'),          { ssr: false });
const PlaceNearby           = dynamic(() => import('@/components/places/PlaceNearby'),           { ssr: false });
const PlaceFooter           = dynamic(() => import('@/components/places/PlaceFooter'),           { ssr: false });
const Header                = dynamic(() => import('@/components/layout/Header').then(m => ({ default: m.Header })), { ssr: false });

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full bg-[var(--bg-hover)]" style={{ height: 'clamp(280px, 60vh, 680px)' }} />
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-4">
        <div className="h-6 bg-[var(--bg-hover)] rounded w-24" />
        <div className="h-10 bg-[var(--bg-hover)] rounded w-2/3" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-full" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-5/6" />
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

  const hasSeason = place.safety.openFromDate || place.safety.openToDate || place.bestSeason || place.seasonalNotes;

  return (
    <>
      <Header />

      {/* 1. Hero: фото + тип + координаты */}
      <PlaceHero
        placeId={place.id}
        name={place.name}
        locationType={place.locationType}
        lat={place.lat}
        lng={place.lng}
        photoUrl={place.photoUrl}
        photoCount={place.photoCount}
      />

      {/* 2. Realtime: статус открытия / алерты */}
      {place.realtime && <PlaceRealtimeStatus realtime={place.realtime} />}

      {/* 3. Название + описание */}
      <PlaceDescription
        name={place.name}
        essence={place.essence}
        description={place.description}
        placeId={place.id}
      />

      {/* 4. Факты места: тип, сложность, район, опасности */}
      <div className="mt-6">
        <PlaceCharacteristics
          locationType={place.locationType}
          zone={place.zone}
          safety={place.safety}
          terrainType={place.safety.terrainType}
        />
      </div>

      {/* 5. Безопасность: развёрнутые данные */}
      <div className="mt-6">
        <PlaceSafety safety={place.safety} placeId={place.id} />
      </div>

      {/* 6. Сезонность */}
      {hasSeason && (
        <div className="mt-6">
          <PlaceSeason
            openFromDate={place.safety.openFromDate}
            openToDate={place.safety.openToDate}
            bestSeason={place.bestSeason}
            seasonalNotes={place.seasonalNotes}
          />
        </div>
      )}

      {/* 7. Маршруты через это место */}
      {place.routes.length > 0 && (
        <div className="mt-6">
          <PlaceRoutes routes={place.routes} placeId={place.id} />
        </div>
      )}

      {/* 8. Туры к этому месту */}
      {place.tours.length > 0 && (
        <div className="mt-6">
          <PlaceTours tours={place.tours} />
        </div>
      )}

      {/* 10. Карта + как добраться */}
      <div className="mt-6">
        <PlaceAccess
          placeId={place.id}
          name={place.name}
          lat={place.lat}
          lng={place.lng}
          accessInfo={place.accessInfo}
          nearbyMarkers={place.nearby}
        />
      </div>

      {/* 11. Кузьмич */}
      <div className="mt-6">
        <PlaceKuzmich
          placeId={place.id}
          placeName={place.name}
          kuzmichReview={place.kuzmichReview}
        />
      </div>

      {/* 12. Отзывы о месте */}
      <div className="mt-6">
        <PlaceReviews placeId={place.id} reviews={place.reviews} />
      </div>

      {/* 13. Места рядом */}
      {place.nearby.length > 0 && (
        <div className="mt-6">
          <PlaceNearby nearby={place.nearby} placeId={place.id} />
        </div>
      )}

      {/* 12. Подвал */}
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
