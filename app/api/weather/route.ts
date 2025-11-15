import { NextRequest, NextResponse } from 'next/server';

// Координаты Петропавловска-Камчатского
const KAMCHATKA_LAT = 53.0444;
const KAMCHATKA_LON = 158.6483;

export const dynamic = 'force-dynamic';

interface YandexWeatherResponse {
  fact: {
    temp: number;
    feels_like: number;
    condition: string;
    wind_speed: number;
    wind_dir: string;
    pressure_mm: number;
    humidity: number;
    daytime: string;
    polar: boolean;
    season: string;
    obs_time: number;
  };
  forecasts: Array<{
    date: string;
    parts: {
      day: {
        temp_avg: number;
        condition: string;
      };
    };
  }>;
}

// Маппинг условий Яндекса на наши типы погоды
function mapYandexConditionToWeatherType(condition: string): 'clear' | 'snow' | 'rain' | 'wind' {
  const snowConditions = ['snow', 'snow-showers', 'wet-snow', 'light-snow'];
  const rainConditions = ['rain', 'drizzle', 'light-rain', 'moderate-rain', 'heavy-rain', 'showers', 'thunderstorm'];
  const windConditions = ['wind', 'hurricane'];

  if (snowConditions.includes(condition)) return 'snow';
  if (rainConditions.includes(condition)) return 'rain';
  if (windConditions.includes(condition)) return 'wind';
  return 'clear';
}

// Определение времени суток
function getTimeOfDay(hour: number): 'night' | 'morning' | 'day' | 'evening' {
  if (hour >= 0 && hour < 6) return 'night';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  return 'evening';
}

// Получение температуры в зависимости от условий (для красивого отображения)
function getWeatherEmoji(condition: string): string {
  const emojiMap: Record<string, string> = {
    'clear': '☀️',
    'partly-cloudy': '⛅',
    'cloudy': '☁️',
    'overcast': '☁️',
    'light-rain': '🌦️',
    'rain': '🌧️',
    'heavy-rain': '⛈️',
    'showers': '🌧️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'snow-showers': '🌨️',
    'light-snow': '🌨️',
    'wet-snow': '🌨️',
    'wind': '💨',
    'hurricane': '🌪️'
  };
  return emojiMap[condition] || '☀️';
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.YANDEX_WEATHER_API_KEY;
    
    if (!apiKey) {
      console.error('❌ YANDEX_WEATHER_API_KEY не найден в переменных окружения');
      return NextResponse.json(
        { 
          success: false, 
          error: 'API ключ не настроен',
          // Возвращаем дефолтные значения для демо
          data: getFallbackWeather()
        },
        { status: 200 } // Возвращаем 200 чтобы фронт не упал
      );
    }

    // Запрос к Яндекс.Погода API
    const url = `https://api.weather.yandex.ru/v2/forecast?lat=${KAMCHATKA_LAT}&lon=${KAMCHATKA_LON}&limit=1&hours=false&extra=false`;
    
    console.log('🌤️ Запрос погоды для Камчатки:', { lat: KAMCHATKA_LAT, lon: KAMCHATKA_LON });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Yandex-API-Key': apiKey,
      },
      next: { revalidate: 600 } // Кэшируем на 10 минут
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка API Яндекс.Погоды:', response.status, errorText);
      return NextResponse.json(
        { 
          success: false, 
          error: `Ошибка API: ${response.status}`,
          data: getFallbackWeather()
        },
        { status: 200 }
      );
    }

    const data: YandexWeatherResponse = await response.json();
    
    console.log('✅ Погода получена:', {
      temp: data.fact.temp,
      condition: data.fact.condition,
      feels_like: data.fact.feels_like
    });

    // Формируем ответ
    const weatherData = {
      temperature: data.fact.temp,
      feelsLike: data.fact.feels_like,
      condition: data.fact.condition,
      weatherType: mapYandexConditionToWeatherType(data.fact.condition),
      timeOfDay: getTimeOfDay(new Date().getHours()),
      windSpeed: data.fact.wind_speed,
      humidity: data.fact.humidity,
      pressure: data.fact.pressure_mm,
      emoji: getWeatherEmoji(data.fact.condition),
      location: 'Петропавловск-Камчатский',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: weatherData
    });

  } catch (error) {
    console.error('❌ Критическая ошибка при получении погоды:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Внутренняя ошибка сервера',
        data: getFallbackWeather()
      },
      { status: 200 }
    );
  }
}

// Fallback погода для демонстрации (если API недоступен)
function getFallbackWeather() {
  const hour = new Date().getHours();
  return {
    temperature: -5,
    feelsLike: -8,
    condition: 'partly-cloudy',
    weatherType: 'clear' as const,
    timeOfDay: getTimeOfDay(hour),
    windSpeed: 3,
    humidity: 75,
    pressure: 760,
    emoji: '⛅',
    location: 'Петропавловск-Камчатский',
    timestamp: new Date().toISOString(),
    isFallback: true
  };
}
