'use client';

import { useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';

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

function buildPopupHtml(marker: MapMarker): string {
  let html = `<strong style="font-size:13px">${marker.title}</strong>`;
  if (marker.description) {
    html += `<br/><span style="color:#666;font-size:12px">${marker.description}</span>`;
  }
  if (marker.href) {
    html += `<br/><a href="${marker.href}" style="color:#D44A0C;font-size:12px;font-weight:600;text-decoration:none;display:inline-block;margin-top:4px">Смотреть маршрут &rarr;</a>`;
  }
  return html;
}

function createMarkerIcon(hex: string, type?: MarkerType): { className: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] } {
  let shape = '';
  let size = 10;
  let anchor = 5;

  // Different shapes for different types
  switch (type) {
    case MarkerType.TRANSFER:
      // Square
      shape = `<div style="width:${size}px;height:${size}px;background:${hex};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`;
      break;
    case MarkerType.ACCOMMODATION:
      // Diamond
      shape = `<div style="width:${size}px;height:${size}px;background:${hex};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);transform:rotate(45deg)"></div>`;
      break;
    case MarkerType.RESTAURANT:
      // Cross
      shape = `<div style="position:relative;width:${size}px;height:${size}px;background:${hex};mask-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22><path d=%22M5 0v10M0 5h10%22 stroke=%22white%22 stroke-width=%222%22/></svg>');box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`;
      break;
    case MarkerType.POI:
      // Star (6-pointed)
      shape = `<div style="width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size}px solid ${hex};filter:drop-shadow(0 1px 3px rgba(0,0,0,0.4))"></div>`;
      break;
    case MarkerType.TOUR:
    default:
      // Circle (default)
      shape = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${hex};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`;
  }

  return {
    className: '',
    html: shape,
    iconSize: [size, size] as [number, number],
    iconAnchor: [anchor, anchor] as [number, number],
  };
}

export default function LeafletMap({
  markers = [],
  center = [53.0444, 158.6483],
  zoom = 8,
  height = '400px',
  className = '',
  attribution = true,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);

  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (layerRef.current) {
      layerRef.current.clearLayers();
    } else {
      layerRef.current = L.featureGroup().addTo(map);
    }

    markers.forEach(marker => {
      const hex = COLOR_HEX[marker.color ?? 'blue'] ?? '#2568B0';
      const icon = L.divIcon(createMarkerIcon(hex, marker.type));

      // Draw polyline/polygon if geometry present
      if (marker.geometry && marker.geometry.coordinates.length >= 2) {
        const geomHex = COLOR_HEX[marker.geometry.color ?? marker.color ?? 'teal'] ?? '#0D9488';
        const geomWeight = marker.geometry.weight ?? 4;
        const latlngs = marker.geometry.coordinates;
        const shape = marker.geometry.type === 'polygon'
          ? L.polygon(latlngs, { color: geomHex, weight: geomWeight, opacity: 0.85, fillOpacity: 0.15 })
          : L.polyline(latlngs, { color: geomHex, weight: geomWeight, opacity: 0.85 });
        shape.bindPopup(buildPopupHtml(marker));
        shape.addTo(layerRef.current);
      }

      const m = L.marker(marker.coords, { icon }).addTo(layerRef.current);
      if (marker.title) {
        m.bindPopup(buildPopupHtml(marker));
      }
    });

    if (markers.length > 1) {
      map.fitBounds(layerRef.current.getBounds().pad(0.1));
    } else if (markers.length === 1) {
      map.setView(markers[0].coords, 12);
    }
  }, [markers]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then(L => {
      leafletRef.current = L;

      const map = L.map(containerRef.current!, {
        attributionControl: attribution,
      }).setView(center, zoom);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: attribution ? '&copy; OpenStreetMap' : '',
        maxZoom: 19,
      }).addTo(map);

      // Draw initial markers if any
      if (markers.length > 0) {
        layerRef.current = L.featureGroup().addTo(map);
        markers.forEach(marker => {
          const hex = COLOR_HEX[marker.color ?? 'blue'] ?? '#2568B0';
          const icon = L.divIcon(createMarkerIcon(hex, marker.type));

          if (marker.geometry && marker.geometry.coordinates.length >= 2) {
            const geomHex = COLOR_HEX[marker.geometry.color ?? marker.color ?? 'teal'] ?? '#0D9488';
            const geomWeight = marker.geometry.weight ?? 4;
            const latlngs = marker.geometry.coordinates;
            const shape = marker.geometry.type === 'polygon'
              ? L.polygon(latlngs, { color: geomHex, weight: geomWeight, opacity: 0.85, fillOpacity: 0.15 })
              : L.polyline(latlngs, { color: geomHex, weight: geomWeight, opacity: 0.85 });
            shape.bindPopup(buildPopupHtml(marker));
            shape.addTo(layerRef.current);
          }

          const m = L.marker(marker.coords, { icon }).addTo(layerRef.current);
          if (marker.title) {
            m.bindPopup(buildPopupHtml(marker));
          }
        });
        if (markers.length > 1) {
          map.fitBounds(layerRef.current.getBounds().pad(0.1));
        }
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
        leafletRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when they change (after initial load)
  useEffect(() => {
    if (mapRef.current && leafletRef.current) {
      updateMarkers();
    }
  }, [updateMarkers]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`rounded-lg overflow-hidden border border-[var(--border)] ${className}`}
    />
  );
}
