import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GeocodeResult {
  success: boolean;
  data?: {
    address: string;
    coordinates: [number, number]; // [lat, lon]
    kind: string;
    precision: string;
  };
  error?: string;
}

/**
 * API для геокодирования адресов через Яндекс.Карты
 * 
 * Примеры запросов:
 * GET /api/geocode?address=Петропавловск-Камчатский,+проспект+Победы,+1
 * GET /api/geocode?coords=53.0444,158.6483 (обратное геокодирование)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const coords = searchParams.get('coords');
    
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API ключ не настроен'
      } as GeocodeResult, { status: 500 });
    }

    if (!address && !coords) {
      return NextResponse.json({
        success: false,
        error: 'Необходимо указать address или coords'
      } as GeocodeResult, { status: 400 });
    }

    // Формируем URL для Яндекс.Геокодера
    const geocode = address || coords;
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(geocode!)}&format=json&results=1`;

    console.log('🗺️ Геокодирование:', geocode);

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Кэшируем на 1 час
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка геокодера:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `Ошибка API: ${response.status}`
      } as GeocodeResult, { status: response.status });
    }

    const data = await response.json();
    
    // Парсим ответ Яндекса
    const geoObject = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    
    if (!geoObject) {
      return NextResponse.json({
        success: false,
        error: 'Адрес не найден'
      } as GeocodeResult, { status: 404 });
    }

    // Извлекаем координаты (приходят в формате "lon lat")
    const [lon, lat] = geoObject.Point.pos.split(' ').map(Number);
    
    const result: GeocodeResult = {
      success: true,
      data: {
        address: geoObject.metaDataProperty.GeocoderMetaData.text,
        coordinates: [lat, lon],
        kind: geoObject.metaDataProperty.GeocoderMetaData.kind,
        precision: geoObject.metaDataProperty.GeocoderMetaData.precision
      }
    };

    console.log('✅ Геокодирование успешно:', result.data);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Ошибка геокодирования:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    } as GeocodeResult, { status: 500 });
  }
}
