import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { NearbyPlace } from './types';
import { LOCATION_TYPE_LABELS } from './types';

interface Props {
  nearby: NearbyPlace[];
  placeId: string;
}

export default function PlaceNearby({ nearby, placeId: _ }: Props) {
  if (!nearby.length) return null;

  return (
    <section className="mt-8">
      <h2
        className="text-lg font-bold text-[var(--text-primary)] px-4 mb-3"
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        Рядом
      </h2>

      {/* Horizontal scroll on mobile, grid on md+ */}
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-3 md:overflow-visible"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {nearby.map(n => (
          <Link
            key={n.id}
            href={`/places/${n.id}`}
            className="flex-shrink-0 w-40 md:w-auto ds-card overflow-hidden group hover:border-[var(--accent)] transition-colors"
          >
            {/* Thumb */}
            <div className="relative w-full bg-[var(--bg-hover)]" style={{ paddingBottom: '65%' }}>
              {n.thumbUrl ? (
                <Image
                  src={n.thumbUrl}
                  alt={n.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 160px, 33vw"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--bg-hover)] to-[var(--bg-card)]">
                  <MapPin className="w-5 h-5 text-[var(--text-muted)] opacity-40" />
                </div>
              )}
              {/* Distance badge */}
              <span className="absolute top-2 right-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-full">
                {n.distanceKm} км
              </span>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                {n.name}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {LOCATION_TYPE_LABELS[n.locationType ?? 'other'] ?? 'Место'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
