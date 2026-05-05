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
  /** Показать позицию пользователя (синяя точка) — работает через GPS без интернета */
  showUserLocation?: boolean;
  /** Высота приоритета: «battery» (экономит батарею) или «highAccuracy» (максимум точности) */
  locationPriority?: 'battery' | 'highAccuracy';
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
  showUserLocation = false,
  locationPriority = 'highAccuracy',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Watch ID для GPS — вынесен наверх, чтобы доступный в cleanup()
    let userLocationWatchId: number | null = null;

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
        zoomControl: false,
        attributionControl: attribution !== false,
        minZoom: 5,
        maxZoom: 12,
        maxBounds: L.latLngBounds(
          L.latLng(48.0, 153.0),
          L.latLng(64.0, 178.0)
        ),
        maxBoundsViscosity: 1.0,
      });

      // Глобальный фикс: маркеры ВСЕГДА поверх тайлов (z-index > tilePane=400)
      if (!document.getElementById('kh-marker-zfix')) {
        const s = document.createElement('style');
        s.id = 'kh-marker-zfix';
        s.textContent = `
          .leaflet-marker-pane, .leaflet-popup-pane, .leaflet-tooltip-pane { z-index: 1000 !important; }
          .leaflet-overlay-pane { z-index: 400 !important; }
        `;
        document.head.appendChild(s);
      }

      // Zoom-контролы — справа вверху, чтобы не перекрывать фильтры снизу
      L.control.zoom({ position: 'topright' }).addTo(map);

      // OpenTopoMap тайлы — topo relief (z-index 400)
      L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: attribution !== false ? '© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)' : '',
      }).addTo(map);

      // Группа кластеров
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
      console.log('[LeafletMap] markers count:', markers.length, 'first:', markers[0]);

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
            // Маршрут-линия (трек): толстая полупрозрачная подложка + тонкая яркая линия сверху — как в OsmAnd/Gaia GPS
            L.polyline(coords, {
              color: geomHex,
              weight: (marker.geometry.weight ?? 3) + 3,
              opacity: 0.25,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);
            L.polyline(coords, {
              color: geomHex,
              weight: marker.geometry.weight ?? 3,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);
          }
        }

        // Кастомный SVG-маркер по типу локации
        const svgIcons: Record<string, string> = {
          volcano:    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><path d="M12 2L2 22h20L12 2z" fill="${hex}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="14" r="2" fill="#fff" opacity="0.8"/></svg>`,
          hot_spring: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M9 14c0-2 1.5-3 3-3s3 1 3 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
          geyser:     `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M12 8v6M9 11l3 3 3-3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          lake:       `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M7 14c1.5-1 3-1 5 0s3.5 1 5 0" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
          mountain:   `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><path d="M12 4L3 22h18L12 4z" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M8 22l4-8 4 8" stroke="#fff" stroke-width="1" stroke-linecap="round"/></svg>`,
          waterfall:  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M10 10v8M14 10v8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
          beach:      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="14" r="3" fill="#fff" opacity="0.6"/></svg>`,
          viewpoint:  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M12 10v4l3 2" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          rock:       `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><path d="M7 20l2-12 6-4 4 8-3 8H7z" fill="${hex}" stroke="#fff" stroke-width="1.5"/></svg>`,
          island:     `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><ellipse cx="12" cy="18" rx="8" ry="4" fill="#475569" opacity="0.3"/><path d="M4 18c0-4 3-8 8-8s8 4 8 8-3.5 6-8 6-8-2-8-6z" fill="${hex}" stroke="#fff" stroke-width="1.5"/></svg>`,
          forest:     `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><path d="M12 4L6 16h12L12 4z" fill="${hex}" stroke="#fff" stroke-width="1.5"/><rect x="11" y="16" width="2" height="6" rx="1" fill="#fff" opacity="0.6"/></svg>`,
          river:      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M8 14c2 0 2-3 4-3s2 3 4 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
          bay:        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M7 14c1.5-1.5 3-1.5 5 0s3.5 1.5 5 0" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M7 18c1.5-1 3-1 5 0s3.5 1 5 0" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/></svg>`,
          museum:     `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><path d="M3 14l9-8 9 8v6H3v-6z" fill="${hex}" stroke="#fff" stroke-width="1.5"/><rect x="7" y="16" width="2" height="4" rx="0.5" fill="#fff" opacity="0.6"/><rect x="11" y="16" width="2" height="4" rx="0.5" fill="#fff" opacity="0.6"/><rect x="15" y="16" width="2" height="4" rx="0.5" fill="#fff" opacity="0.6"/></svg>`,
          historical: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><path d="M12 8v4l2 2" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          other:      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28" fill="none"><circle cx="12" cy="14" r="10" fill="${hex}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="14" r="3" fill="#fff" opacity="0.5"/></svg>`,
        };

        const svgIcon = svgIcons[marker.category ?? 'other'] ?? svgIcons.other;
        const icon = L.divIcon({
          html: svgIcon,
          className: 'kh-marker',
          iconSize: [24, 28],
          iconAnchor: [12, 26],
          popupAnchor: [0, -26],
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

      // GPS-позиция пользователя (синяя точка) — работает без интернета!
      if (showUserLocation && typeof navigator !== 'undefined' && navigator.geolocation) {
        // Маркер «Я здесь»
        const userIcon = L.divIcon({
          html: `
            <div style="position:relative;width:20px;height:20px;">
              <div style="
                position:absolute;inset:-8px;
                border-radius:50%;
                background:rgba(66,133,244,0.2);
                animation:kh-pulse 2s ease-out infinite;
              "></div>
              <div style="
                width:20px;height:20px;
                border-radius:50%;
                background:#4285f4;
                border:3px solid #fff;
                box-shadow:0 0 8px rgba(66,133,244,0.6);
              "></div>
            </div>
          `,
          className: 'kh-user-location',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const userMarker = L.marker([center[0], center[1]], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        // Точный круг точности (как в Google Maps / OsmAnd)
        const accuracyCircle = L.circle([center[0], center[1]], {
          radius: 1000, // стартовое значение, обновим при первом фиксе
          color: '#4285f4',
          fillColor: '#4285f4',
          fillOpacity: 0.1,
          weight: 1,
          interactive: false,
        }).addTo(map);

        // Отслеживание позиции в реальном времени
        userLocationWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy; // метры точности (обычно 5-50м)
            userMarker.setLatLng([lat, lng]);
            accuracyCircle.setLatLng([lat, lng]);
            accuracyCircle.setRadius(acc);
            // Центрируем карту на пользователе при первом фиксе или если зум > 12
            if (map.getZoom() >= 12) {
              map.panTo([lat, lng], { animate: true, duration: 0.5 });
            }
          },
          () => { /* ошибка геолокации — молча */ },
          {
            enableHighAccuracy: locationPriority === 'highAccuracy',
            maximumAge: 10000, // используем кэшированную позицию до 10 сек
            timeout: 15000,
          }
        );
      }

      mapRef.current = map;
    });

    return () => {
      // Останавливаем GPS-трекинг при размонтировании (экономит батарею)
      if (userLocationWatchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(userLocationWatchId);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, center, zoom, onMarkerClick, attribution, showUserLocation, locationPriority]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`overflow-hidden ${className}`}
    />
  );
}
