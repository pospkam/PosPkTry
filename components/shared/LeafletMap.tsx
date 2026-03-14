'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapMarker {
  coords: [number, number];
  title: string;
  description?: string;
  color?: string;
}

interface LeafletMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
}

const COLOR_HEX: Record<string, string> = {
  red:       '#DC2626',
  blue:      '#2568B0',
  green:     '#3FB950',
  orange:    '#D44A0C',
  purple:    '#8B5CF6',
  darkBlue:  '#1E40AF',
  darkCyan:  '#0891B2',
  lightBlue: '#38BDF8',
  darkGreen: '#15803D',
  teal:      '#0D9488',
  brown:     '#92400E',
  gray:      '#6B7280',
  darkOrange:'#C2410C',
  cyan:      '#06B6D4',
};

export default function LeafletMap({
  markers = [],
  center = [53.0444, 158.6483],
  zoom = 8,
  height = '400px',
  className = '',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Leaflet must be imported client-side only
    import('leaflet').then(L => {
      // Fix default marker icon (webpack issue)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!).setView(center, zoom);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (markers.length > 0) {
        const group = L.featureGroup();

        markers.forEach(marker => {
          const hex = COLOR_HEX[marker.color ?? 'blue'] ?? '#2568B0';
          const svgIcon = L.divIcon({
            className: '',
            html: `<div style="width:12px;height:12px;border-radius:50%;background:${hex};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          const m = L.marker(marker.coords, { icon: svgIcon }).addTo(map);
          if (marker.title) {
            m.bindPopup(`<strong>${marker.title}</strong>${marker.description ? `<br/><span style="color:#666;font-size:12px">${marker.description}</span>` : ''}`);
          }
          group.addLayer(m);
        });

        if (markers.length > 1) {
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }
    });

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`rounded-lg overflow-hidden border border-[var(--border)] ${className}`}
    />
  );
}
