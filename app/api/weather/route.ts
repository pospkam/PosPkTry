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

// Определение времени суток для Камчатки (UTC+12)
function getTimeOfDay(utcHour?: number): 'night' | 'morning' | 'day' | 'evening' {
  // Если час не передан, вычисляем текущее камчатское время
  let hour: number;
  
  if (utcHour !== undefined) {
    // Если передан UTC час, добавляем 12 часов для Камчатки
    hour = (utcHour + 12) % 24;
  } else {
    // Вычисляем текущее время в Камчатке
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kamchatkaTime = new Date(utc + (3600000 * 12));
    hour = kamchatkaTime.getHours();
  }
  
  console.log('Время суток - час в Камчатке:', hour);
  
  if (hour >= 0 && hour < 6) return 'night';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  return 'evening';
}

// Получение иконки для условий погоды
function getWeatherIcon(condition: string): string {
  const iconMap: Record<string, string> = {
    'clear': 'sun',
    'partly-cloudy': 'cloud-sun',
    'cloudy': 'cloud',
    'overcast': 'cloud',
    'light-rain': 'cloud-rain',
    'rain': 'cloud-rain',
    'heavy-rain': 'cloud-rain',
    'showers': 'cloud-rain',
    'thunderstorm': 'cloud-lightning',
    'snow': 'snowflake',
    'snow-showers': 'snowflake',
    'light-snow': 'snowflake',
    'wet-snow': 'snowflake',
    'wind': 'wind',
    'hurricane': 'wind'
  };
  return iconMap[condition] || 'sun';
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

    // Формируем ответ с камчатским временем
    const weatherData = {
      temperature: data.fact.temp,
      feelsLike: data.fact.feels_like,
      condition: data.fact.condition,
      weatherType: mapYandexConditionToWeatherType(data.fact.condition),
      timeOfDay: getTimeOfDay(), // Вызываем без параметра - вычислится камчатское время
      windSpeed: data.fact.wind_speed,
      humidity: data.fact.humidity,
      pressure: data.fact.pressure_mm,
      icon: getWeatherIcon(data.fact.condition),
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
  return {
    temperature: -5,
    feelsLike: -8,
    condition: 'partly-cloudy',
    weatherType: 'clear' as const,
    timeOfDay: getTimeOfDay(), // Используем камчатское время
    windSpeed: 3,
    humidity: 75,
    pressure: 760,
    icon: 'cloud-sun',
    location: 'Петропавловск-Камчатский',
    timestamp: new Date().toISOString(),
    isFallback: true
  };
}
