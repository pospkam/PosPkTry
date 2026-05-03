'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LOCATION_TYPE_LABELS } from './types';
import { RouteGradientPlaceholder } from '@/components/routes/RouteGradientPlaceholder';

interface Props {
  placeId: string;
  name: string;
  locationType: string | null;
  lat: number;
  lng: number;
  photoUrl: string | null;
  photoCount: number;
}

export default function PlaceHero({ placeId, name, locationType, lat, lng, photoUrl, photoCount }: Props) {
  const label = LOCATION_TYPE_LABELS[locationType ?? 'other'] ?? 'Место';
  const imgSrc = photoUrl ?? (photoCount > 0 ? `/api/images/route/${placeId}` : null);
  const coordStr = `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;

  return (
    <div
      className="relative w-full overflow-hidden bg-[var(--bg-hover)]"
      style={{ height: 'clamp(280px, 60vh, 680px)' }}
    >
      {/* Back button */}
      <div className="absolute top-20 left-4 z-20">
        <Link
          href="/routes?kind=place"
          className="inline-flex items-center gap-1.5 text-sm text-white bg-black/50 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Места
        </Link>
      </div>

      {/* Photo */}
      {imgSrc ? (
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      ) : (
        <RouteGradientPlaceholder
          title={name}
          locationType={locationType}
          className="w-full h-full"
          showLabel={true}
        />
      )}

      {/* Gradient overlay */}
      {imgSrc && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      )}

      {/* Bottom-left: type badge */}
      <div className="absolute bottom-5 left-4 z-10">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-[var(--accent)] px-3 py-1.5 rounded-full">
          {label}
        </span>
      </div>

      {/* Bottom-right: coordinates */}
      <button
        className="absolute bottom-5 right-4 z-10 text-xs text-white bg-black/50 px-2.5 py-1.5 rounded-lg font-mono hover:bg-black/70 transition-colors"
        onClick={() => navigator.clipboard?.writeText(coordStr)}
        title="Скопировать координаты"
      >
        {coordStr}
      </button>
    </div>
  );
}
