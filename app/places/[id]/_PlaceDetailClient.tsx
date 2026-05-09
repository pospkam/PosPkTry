'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Navigation, Download, Phone } from 'lucide-react';
import type { PlaceData } from '@/components/places/types';

const PlaceHero             = dynamic(() => import('@/components/places/PlaceHero'),             { ssr: false });
const OfflineGPSBanner      = dynamic(() => import('@/components/shared/OfflineGPSBanner'),      { ssr: false });
const PlaceRealtimeStatus   = dynamic(() => import('@/components/places/PlaceRealtimeStatus'),   { ssr: false });
const PlaceDescription      = dynamic(() => import('@/components/places/PlaceDescription'),      { ssr: false });
const PlaceCharacteristics  = dynamic(() => import('@/components/places/PlaceCharacteristics'),  { ssr: false });
const PlaceSafety           = dynamic(() => import('@/components/places/PlaceSafety'),           { ssr: false });
const PlaceAccess           = dynamic(() => import('@/components/places/PlaceAccess'),           { ssr: false });
const PlaceSeason           = dynamic(() => import('@/components/places/PlaceSeason'),           { ssr: false });
const PlaceRoutes           = dynamic(() => import('@/components/places/PlaceRoutes'),           { ssr: false });
const PlaceKuzmich          = dynamic(() => import('@/components/places/PlaceKuzmich'),          { ssr: false });
const PlaceReviews          = dynamic(() => import('@/components/places/PlaceReviews'),          { ssr: false });
const PlaceNearby           = dynamic(() => import('@/components/places/PlaceNearby'),           { ssr: false });
const PlaceEco              = dynamic(() => import('@/components/places/PlaceEco'),              { ssr: false });
const PlaceLNT              = dynamic(() => import('@/components/places/PlaceLNT'),              { ssr: false });
const PlaceIndigenous       = dynamic(() => import('@/components/places/PlaceIndigenous'),       { ssr: false });
const PlaceFooter           = dynamic(() => import('@/components/places/PlaceFooter'),           { ssr: false });
const Header                = dynamic(() => import('@/components/layout/Header').then(m => ({ default: m.Header })), { ssr: false });

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full bg-[var(--bg-hover)]" style={{ height: 'clamp(320px, 68vh, 720px)' }} />
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-4">
        <div className="h-5 bg-[var(--bg-hover)] rounded-full w-20" />
        <div className="h-9 bg-[var(--bg-hover)] rounded-lg w-3/4" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-full" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-5/6" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-4/6" />
        <div className="flex gap-2 mt-6">
          {[1,2,3,4].map(i => <div key={i} className="h-9 bg-[var(--bg-hover)] rounded-xl w-28" />)}
        </div>
      </div>
    </div>
  );
}

function MobileBottomBar({ place }: { place: PlaceData }) {
  const orgMapsUrl = `om://map?v=1&ll=${place.lat},${place.lng}&n=${encodeURIComponent(place.name)}`;
  const geoUrl = `geo:${place.lat},${place.lng}?q=${encodeURIComponent(place.name)}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
      <div className="flex items-center gap-2 px-3 py-3 bg-[var(--bg-card)]/95 border-t border-[var(--border)]">
        <a
          href={geoUrl}
          className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[var(--accent)] rounded-xl py-3 hover:opacity-90 transition-opacity"
        >
          <Navigation className="w-4 h-4" />
          Навигация
        </a>
        <a
          href={orgMapsUrl}
          className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl py-3 hover:border-[var(--accent)] transition-colors"
        >
          <Download className="w-4 h-4" />
          Оффлайн
        </a>
        <a
          href="tel:112"
          className="flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-[var(--danger)] rounded-xl py-3 px-4 hover:opacity-90 transition-opacity"
        >
          <Phone className="w-4 h-4" />
          СОС
        </a>
      </div>
    </div>
  );
}

const LS_PREFIX = 'kh_place_';

function lsRead(id: string): PlaceData | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + id);
    return raw ? (JSON.parse(raw) as PlaceData) : null;
  } catch { return null; }
}

function lsWrite(id: string, data: PlaceData) {
  try {
    localStorage.setItem(LS_PREFIX + id, JSON.stringify(data));
  } catch { /* localStorage full */ }
}

export default function PlaceDetailClient({ id }: { id: string }) {
  const [place, setPlace] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Показываем кэш сразу — пока грузится сеть
      const cached = lsRead(id);
      if (cached && !cancelled) {
        setPlace(cached);
        setLoading(false);
        setFromCache(true);
      }

      try {
        const res = await fetch(`/api/places/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!cancelled) {
          if (j?.success && j.data) {
            setPlace(j.data);
            setFromCache(false);
            lsWrite(id, j.data); // сохраняем для следующего офлайн-визита
          } else if (!cached) {
            setError(j.error ?? 'Место не найдено');
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          if (!cached) setError('Нет подключения. Откройте карточку онлайн заранее.');
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
          <Link href="/routes?kind=place" className="ds-btn ds-btn-secondary">← Все места</Link>
        </div>
      </>
    );
  }

  const hasSeason = place.safety.openFromDate || place.safety.openToDate || place.bestSeason || place.seasonalNotes;

  return (
    <>
      <Header />
      <OfflineGPSBanner />

      {/* 1. Hero — full-width photo with name overlay */}
      <PlaceHero
        placeId={place.id}
        name={place.name}
        locationType={place.locationType}
        lat={place.lat}
        lng={place.lng}
        photoUrl={place.photoUrl}
        photoCount={place.photoCount}
      />

      {/* Offline cache notice */}
      {fromCache && (
        <div className="w-full px-4 py-2 bg-[var(--bg-hover)] border-b border-[var(--border)] flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] flex-shrink-0" />
          Данные из кэша — нет подключения к сети
        </div>
      )}

      {/* 2. Realtime alert — sticky on danger */}
      {place.realtime && <PlaceRealtimeStatus realtime={place.realtime} />}

      {/* 3. Description */}
      <PlaceDescription
        name={place.name}
        essence={place.essence}
        description={place.description}
        placeId={place.id}
      />

      {/* 3b. Indigenous — context before characteristics */}
      {place.indigenous && <PlaceIndigenous indigenous={place.indigenous} />}

      {/* 4. Stat pills + hazard chips */}
      <PlaceCharacteristics
        locationType={place.locationType}
        zone={place.zone}
        safety={place.safety}
        terrainType={place.safety.terrainType}
      />

      {/* 5. Safety block */}
      <PlaceSafety safety={place.safety} placeId={place.id} />

      {/* 6. Eco */}
      {place.eco && (
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <PlaceEco eco={place.eco} placeName={place.name} />
        </div>
      )}

      {/* 6b. Universal LNT — for all places */}
      <PlaceLNT
        capacityPerDay={place.safety.capacityPerDay}
        ecoZone={place.eco?.zone ?? null}
      />

      {/* 7. Season */}
      {hasSeason && (
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <PlaceSeason
            openFromDate={place.safety.openFromDate}
            openToDate={place.safety.openToDate}
            bestSeason={place.bestSeason}
            seasonalNotes={place.seasonalNotes}
          />
        </div>
      )}

      {/* 8. Routes through this place */}
      {place.routes.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 mt-8">
          <PlaceRoutes routes={place.routes} placeId={place.id} />
        </div>
      )}


      {/* 10. Map + access */}
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

      {/* 11. Kuzmich */}
      <div className="max-w-3xl mx-auto px-4 mt-6">
        <PlaceKuzmich
          placeId={place.id}
          placeName={place.name}
          kuzmichReview={place.kuzmichReview}
        />
      </div>

      {/* 12. Reviews */}
      <div className="max-w-3xl mx-auto px-4 mt-6">
        <PlaceReviews placeId={place.id} reviews={place.reviews} />
      </div>

      {/* 13. Nearby places — horizontal scroll mobile */}
      {place.nearby.length > 0 && (
        <div className="mt-6">
          <PlaceNearby nearby={place.nearby} placeId={place.id} />
        </div>
      )}

      {/* Footer */}
      <div className="max-w-3xl mx-auto px-4 mt-10 mb-24 md:mb-12">
        <PlaceFooter
          sourceUrl={place.sourceUrl}
          sourceName={place.sourceName}
          updatedAt={place.updatedAt}
        />
      </div>

      {/* Mobile sticky bottom bar */}
      <MobileBottomBar place={place} />
    </>
  );
}
