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
    <section className="max-w-3xl mx-auto px-4 space-y-3">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
        <MapPin className="w-5 h-5 text-[var(--accent)]" /> Места рядом
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {nearby.map(n => (
          <Link
            key={n.id}
            href={`/places/${n.id}`}
            className="ds-card overflow-hidden group hover:border-[var(--accent)] transition-colors"
          >
            {/* Thumb */}
            <div className="relative w-full bg-[var(--bg-hover)]" style={{ paddingBottom: '56%' }}>
              {n.thumbUrl ? (
                <Image
                  src={n.thumbUrl}
                  alt={n.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-[var(--text-muted)] opacity-30" />
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                {n.name}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {LOCATION_TYPE_LABELS[n.locationType ?? 'other'] ?? 'Место'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{n.distanceKm} км</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
