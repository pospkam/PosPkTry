'use client';

import dynamic from 'next/dynamic';
import { Download, Navigation, MapPin, FileDown } from 'lucide-react';
import { MarkerType } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

interface Props {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  accessInfo: string | null;
  nearbyMarkers: { id: string; name: string; lat: number; lng: number; locationType: string | null }[];
}

export default function PlaceAccess({ placeId, name, lat, lng, accessInfo, nearbyMarkers }: Props) {
  const yandexUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=12&l=map`;
  const organicUrl = `geo:${lat},${lng}?z=12`;
  const gpxUrl = `/api/places/${placeId}/gpx`;

  return (
    <section className="max-w-3xl mx-auto px-4 space-y-4">
      <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
        <MapPin className="w-5 h-5 text-[var(--accent)]" /> Как добраться
      </h2>

      {accessInfo && (
        <p className="text-[var(--text-secondary)] leading-relaxed" style={{ fontSize: '17px', lineHeight: '1.7', maxWidth: '68ch' }}>
          {accessInfo}
        </p>
      )}

      {/* Map */}
      <div className="w-full rounded-lg overflow-hidden border border-[var(--border)]">
        <LeafletMap
          center={[lat, lng]}
          zoom={11}
          markers={[
            {
              coords: [lat, lng],
              title: name,
              description: 'Текущее место',
              color: 'red',
              type: MarkerType.TOUR,
              category: 'place',
            },
            ...nearbyMarkers.map(n => ({
              coords: [n.lat, n.lng] as [number, number],
              title: n.name,
              description: n.locationType ?? '',
              color: 'blue' as const,
              type: MarkerType.TOUR,
              category: n.locationType ?? 'other',
            })),
          ]}
          height="300px"
          className="w-full"
        />
      </div>

      {/* Navigation buttons */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <a
          href={gpxUrl}
          download
          className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent)]/20 transition-colors text-center"
        >
          <Download className="w-4 h-4" />
          Скачать GPX
        </a>
        <a
          href={organicUrl}
          className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 text-xs font-semibold hover:bg-green-500/20 transition-colors text-center"
        >
          <Navigation className="w-4 h-4" />
          Organic Maps
        </a>
        <a
          href={yandexUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-[var(--ocean)]/10 border border-[var(--ocean)]/30 text-[var(--ocean)] text-xs font-semibold hover:bg-[var(--ocean)]/20 transition-colors text-center"
        >
          <MapPin className="w-4 h-4" />
          Яндекс.Карты
        </a>
      </div>

      {/* Offline PDF */}
      <a
        href={`/api/places/${placeId}/pdf`}
        download
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-semibold transition-colors"
        style={{
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <FileDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        Скачать карточку для офлайн (PDF)
      </a>
    </section>
  );
}
