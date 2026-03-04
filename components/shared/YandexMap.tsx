'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface YandexMapProps {
  center?: [number, number]; // [latitude, longitude]
  zoom?: number;
  markers?: Array<{
    coords: [number, number];
    title: string;
    description?: string;
    color?: string;
  }>;
  className?: string;
  height?: string;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function YandexMap({
  center = [53.0444, 158.6483], // Петропавловск-Камчатский по умолчанию
  zoom = 12,
  markers = [],
  className = '',
  height = '500px'
}: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Инициализация карты
    const initMap = () => {
      if (window.ymaps && mapRef.current) {
        window.ymaps.ready(() => {
          const map = new window.ymaps.Map(mapRef.current, {
            center: center,
            zoom: zoom,
            controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
          });

          // Добавляем маркеры
          markers.forEach((marker) => {
            const placemark = new window.ymaps.Placemark(
              marker.coords,
              {
                balloonContentHeader: marker.title,
                balloonContentBody: marker.description || '',
              },
              {
                preset: marker.color ? `islands#${marker.color}Icon` : 'islands#blueIcon',
                iconColor: marker.color || '#4A90E2'
              }
            );
            map.geoObjects.add(placemark);
          });

          // Если есть маркеры, центрируем карту по ним
          if (markers.length > 0) {
            const bounds = markers.map(m => m.coords);
            map.setBounds(map.geoObjects.getBounds(), {
              checkZoomRange: true,
              zoomMargin: 50
            });
          }

          setMapInstance(map);
        });
      }
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.destroy();
      }
    };
  }, [isLoaded, center, zoom, markers]);

  if (!apiKey) {
    return (
      <div className={`bg-gray-100 rounded-2xl flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center p-8">
          <p className="text-gray-600 mb-2">Карта временно недоступна</p>
          <p className="text-sm text-gray-500">API ключ не настроен</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`}
        strategy="afterInteractive"
        onLoad={() => setIsLoaded(true)}
      />
      
      <div className={`relative rounded-2xl overflow-hidden shadow-xl ${className}`} style={{ height }}>
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4 mx-auto"></div>
              <p className="text-blue-600 font-semibold">Загрузка карты...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </>
  );
}
