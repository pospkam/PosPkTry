'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

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
  id?: string;
  preset?: string;
  suppressBalloon?: boolean;
}

interface LeafletMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  attribution?: boolean;
  onMarkerClick?: (id: string) => void;
}

const COLOR_MAP: Record<string, string> = {
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
  const hex = COLOR_MAP[marker.color ?? 'blue'] ?? '#2568B0';
  let html = `<div style="font-family:sans-serif;max-width:220px">`;
  html += `<strong style="font-size:13px;color:#111;display:block;margin-bottom:4px">${marker.title}</strong>`;
  if (marker.description) {
    html += `<span style="color:#555;font-size:12px;line-height:1.4">${marker.description}</span>`;
  }
  if (marker.href) {
    html += `<a href="${marker.href}" style="color:${hex};font-size:12px;font-weight:600;text-decoration:none;display:inline-block;margin-top:6px">Смотреть маршрут →</a>`;
  }
  html += `</div>`;
  return html;
}

export default function LeafletMap({
  markers = [],
  center = [53.0444, 158.6483],
  zoom = 8,
  height = '400px',
  className = '',
  attribution = false,
  onMarkerClick,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clusterRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamic import — leaflet + markercluster
    Promise.all([
      import('leaflet'),
      import('leaflet.markercluster'),
    ]).then(([L]) => {
      if (!containerRef.current) return;

      // Уничтожаем предыдущую карту
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: L.latLng(center[0], center[1]),
        zoom,
        zoomControl: true,
        attributionControl: attribution !== false,
        minZoom: 5,
        maxZoom: 12,
        maxBounds: L.latLngBounds(
          L.latLng(48.0, 153.0),
          L.latLng(64.0, 178.0)
        ),
        maxBoundsViscosity: 1.0,
      });

      // OpenTopoMap тайлы — topo relief
      L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: attribution !== false ? '© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)' : '',
      }).addTo(map);

      // Группа кластеров
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clusterGroup = (L as any).markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 200,
        chunkDelay: 50,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 11,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          let size: 'small' | 'medium' | 'large' = 'small';
          let bgColor = '#0f172a'; // slate-900

          if (count >= 100) {
            size = 'large';
            bgColor = '#ea580c'; // orange-600
          } else if (count >= 10) {
            size = 'medium';
            bgColor = '#475569'; // slate-600
          }

          const dim = size === 'large' ? 44 : size === 'medium' ? 36 : 30;
          const fontSize = size === 'large' ? 15 : size === 'medium' ? 13 : 12;

          return L.divIcon({
            html: `<div style="
              background:${bgColor};
              color:#fff;
              width:${dim}px;
              height:${dim}px;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              font-weight:700;
              font-size:${fontSize}px;
              border:2px solid #fff;
              box-shadow:0 2px 8px rgba(0,0,0,0.25);
            ">${count}</div>`,
            className: 'kh-cluster',
            iconSize: [dim, dim],
          });
        },
      });

      const allCoords: [number, number][] = [];

      markers.forEach((marker, idx) => {
        const hex = COLOR_MAP[marker.color ?? 'blue'] ?? '#2568B0';
        const markerId = marker.id ?? `mk_${idx}`;
        allCoords.push(marker.coords);

        // Геометрия маршрута (линии/полигоны) — добавляем НА карту, не в кластер
        if (marker.geometry && marker.geometry.coordinates.length >= 2) {
          const geomHex = COLOR_MAP[marker.geometry.color ?? marker.color ?? 'teal'] ?? '#0D9488';
          const coords = marker.geometry.coordinates as [number, number][];
          if (marker.geometry.type === 'polygon') {
            L.polygon(coords, {
              color: geomHex,
              weight: marker.geometry.weight ?? 2,
              fillOpacity: 0.15,
            }).addTo(map);
          } else {
            L.polyline(coords, {
              color: geomHex,
              weight: marker.geometry.weight ?? 2,
              opacity: 0.85,
            }).addTo(map);
          }
        }

        // Цветной круглый маркер
        const icon = L.divIcon({
          html: `<div style="width:11px;height:11px;border-radius:50%;background:${hex};border:2px solid rgba(255,255,255,0.95);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
          className: '',
          iconSize: [11, 11],
          iconAnchor: [5, 5],
          popupAnchor: [0, -10],
        });

        const m = L.marker(marker.coords, { icon });

        if (!marker.suppressBalloon) {
          m.bindPopup(buildPopupHtml(marker), { maxWidth: 260 });
        }

        if (onMarkerClick) {
          m.on('click', () => onMarkerClick(markerId));
        }

        // Вместо m.addTo(map) — добавляем в кластер
        clusterGroup.addLayer(m);
      });

      // Добавляем кластер на карту
      map.addLayer(clusterGroup);
      clusterRef.current = clusterGroup;

      // Подгоняем вид под все маркеры (через кластер)
      if (allCoords.length > 1) {
        map.fitBounds(allCoords as unknown as import('leaflet').LatLngBoundsExpression, {
          padding: [50, 50],
        });
      }

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, center, zoom, onMarkerClick, attribution]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`rounded-lg overflow-hidden border border-[var(--border)] ${className}`}
    />
  );
}
