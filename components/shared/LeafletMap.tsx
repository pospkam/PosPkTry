'use client';

import { useEffect, useRef } from 'react';

export enum MarkerType {
  TOUR = 'tour',
  TRANSFER = 'transfer',
  ACCOMMODATION = 'accommodation',
  RESTAURANT = 'restaurant',
  POI = 'poi',
}

export interface MapMarkerGeometry {
  type: 'polyline' | 'polygon';
  coordinates: [number, number][];
  color?: string;
  weight?: number;
}

export interface MapMarker {
  coords: [number, number];
  title: string;
  description?: string;
  color?: string;
  href?: string;
  type?: MarkerType;
  category?: string;
  geometry?: MapMarkerGeometry;
}

interface LeafletMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  attribution?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  red: '#DC2626',
  blue: '#2568B0',
  green: '#3FB950',
  orange: '#D44A0C',
  purple: '#8B5CF6',
  darkBlue: '#1E40AF',
  darkCyan: '#0891B2',
  lightBlue: '#38BDF8',
  darkGreen: '#15803D',
  teal: '#0D9488',
  brown: '#92400E',
  gray: '#6B7280',
  darkOrange: '#C2410C',
  cyan: '#06B6D4',
};

function buildBalloonHtml(marker: MapMarker): string {
  let html = `<strong style="font-size:13px;color:#000">${marker.title}</strong>`;
  if (marker.description) {
    html += `<br/><span style="color:#666;font-size:12px">${marker.description}</span>`;
  }
  if (marker.href) {
    html += `<br/><a href="${marker.href}" style="color:#D44A0C;font-size:12px;font-weight:600;text-decoration:none;display:inline-block;margin-top:4px">Смотреть маршрут →</a>`;
  }
  return html;
}

function getMarkerColor(hex: string, type?: MarkerType): { preset: string; icon?: { content: string } } {
  // Yandex preset colors mapping
  if (type === MarkerType.TRANSFER) return { preset: 'islands#blueIcon' };
  if (type === MarkerType.ACCOMMODATION) return { preset: 'islands#greenIcon' };
  if (type === MarkerType.RESTAURANT) return { preset: 'islands#orangeIcon' };
  if (type === MarkerType.POI) return { preset: 'islands#redIcon' };

  // Default to blue for TOUR
  if (hex === '#D44A0C') return { preset: 'islands#orangeIcon' };
  if (hex === '#3FB950') return { preset: 'islands#greenIcon' };
  if (hex === '#DC2626') return { preset: 'islands#redIcon' };
  return { preset: 'islands#blueIcon' };
}

export default function LeafletMap({
  markers = [],
  center = [53.0444, 158.6483],
  zoom = 8,
  height = '400px',
  className = '',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const loadYandexMap = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ymaps = (window as any).ymaps;
      if (!ymaps) return;

      ymaps.ready(() => {
        if (!containerRef.current) return;

        // Destroy previous map if exists
        if (mapRef.current) {
          mapRef.current.destroy();
          mapRef.current = null;
        }

        // Create map
        const map = new ymaps.Map(containerRef.current, {
          center,
          zoom,
          controls: ['geolocationControl', 'zoomControl', 'typeSelector'],
        });

        // Add markers and geometries
        const objectManager = new ymaps.ObjectManager();
        const features: any[] = [];
        const bounds: [number, number][] = [];

        markers.forEach(marker => {
          const hex = COLOR_MAP[marker.color ?? 'blue'] ?? '#2568B0';
          const presetInfo = getMarkerColor(hex, marker.type);
          bounds.push(marker.coords);

          // Add geometry if present
          if (marker.geometry && marker.geometry.coordinates.length >= 2) {
            const geomHex = COLOR_MAP[marker.geometry.color ?? marker.color ?? 'teal'] ?? '#0D9488';
            const geomWeight = marker.geometry.weight ?? 2;
            const coordinates = marker.geometry.coordinates;

            if (marker.geometry.type === 'polygon') {
              features.push({
                type: 'Feature',
                id: `poly_${marker.title}`,
                geometry: {
                  type: 'Polygon',
                  coordinates: [coordinates],
                },
                properties: {
                  balloonContent: buildBalloonHtml(marker),
                  clusterCaption: marker.title,
                },
                options: {
                  strokeColor: geomHex,
                  strokeWidth: geomWeight,
                  fillColor: geomHex,
                  fillOpacity: 0.15,
                },
              });
            } else {
              features.push({
                type: 'Feature',
                id: `line_${marker.title}`,
                geometry: {
                  type: 'LineString',
                  coordinates,
                },
                properties: {
                  balloonContent: buildBalloonHtml(marker),
                  clusterCaption: marker.title,
                },
                options: {
                  strokeColor: geomHex,
                  strokeWidth: geomWeight,
                  opacity: 0.85,
                },
              });
            }
          }

          // Add placemark
          features.push({
            type: 'Feature',
            id: `marker_${marker.title}`,
            geometry: {
              type: 'Point',
              coordinates: marker.coords,
            },
            properties: {
              balloonContent: buildBalloonHtml(marker),
              clusterCaption: marker.title,
              hintContent: marker.title,
            },
            options: {
              preset: presetInfo.preset,
            },
          });
        });

        objectManager.add(features);
        map.geoObjects.add(objectManager);

        // Fit bounds
        if (bounds.length > 1) {
          map.setBounds(bounds, { checkZoomRange: true, zoomMargin: [50, 50, 50, 50] });
        } else if (bounds.length === 1) {
          map.setCenter(bounds[0], zoom || 12);
        }

        mapRef.current = map;
      });
    };

    // Load Yandex Maps API if not loaded
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).ymaps) {
        loadYandexMap();
      } else {
        const script = document.createElement('script');
        script.src = 'https://api-maps.yandex.ru/2.1/?apikey=19c1c748-e99f-424e-8302-e4fb78df529f&lang=ru_RU';
        script.async = true;
        script.onload = loadYandexMap;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [markers, center, zoom]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`rounded-lg overflow-hidden border border-[var(--border)] ${className}`}
    />
  );
}
