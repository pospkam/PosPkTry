/**
 * Open-Meteo Weather API (FREE!)
 * https://open-meteo.com
 * 
 * Преимущества:
 * - Полностью бесплатный
 * - Без API ключа
 * - Неограниченные запросы
 * - Быстрый и надежный
 */

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weathercode: number;
    windspeed_10m: number;
    winddirection_10m: number;
    relativehumidity_2m: number;
  };
  current_units: {
    temperature_2m: string;
    windspeed_10m: string;
  };
}

interface WeatherData {
  temperature: number;
  condition: string;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  location: string;
}

/**
 * Маппинг WMO Weather Code в наши условия
 * https://open-meteo.com/en/docs
 */
function mapWeatherCode(code: number): string {
  // Clear sky
  if (code === 0) return 'clear';
  
  // Mainly clear, partly cloudy, and overcast
  if (code >= 1 && code <= 3) return 'partly_cloudy';
  
  // Fog and depositing rime fog
  if (code === 45 || code === 48) return 'fog';
  
  // Drizzle: Light, moderate, and dense intensity
  if (code >= 51 && code <= 55) return 'drizzle';
  
  // Freezing Drizzle: Light and dense intensity
  if (code === 56 || code === 57) return 'drizzle';
  
  // Rain: Slight, moderate and heavy intensity
  if (code >= 61 && code <= 65) return 'rain';
  
  // Freezing Rain: Light and heavy intensity
  if (code === 66 || code === 67) return 'rain';
  
  // Snow fall: Slight, moderate, and heavy intensity
  if (code >= 71 && code <= 75) return 'snow';
  
  // Snow grains
  if (code === 77) return 'snow';
  
  // Rain showers: Slight, moderate, and violent
  if (code >= 80 && code <= 82) return 'rain';
  
  // Snow showers slight and heavy
  if (code === 85 || code === 86) return 'snow';
  
  // Thunderstorm: Slight or moderate
  if (code === 95) return 'thunderstorm';
  
  // Thunderstorm with slight and heavy hail
  if (code === 96 || code === 99) return 'thunderstorm';
  
  return 'mostly_clear';
}

/**
 * Получить текущую погоду через Open-Meteo API
 */
export async function getWeatherOpenMeteo(
  lat: number,
  lng: number,
  location: string = 'Камчатка'
): Promise<WeatherData> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    
    // Параметры запроса
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lng.toString());
    url.searchParams.append('current', [
      'temperature_2m',
      'weathercode',
      'windspeed_10m',
      'winddirection_10m',
      'relativehumidity_2m'
    ].join(','));
    url.searchParams.append('timezone', 'auto');
    url.searchParams.append('forecast_days', '1');

    const response = await fetch(url.toString(), {
      next: { revalidate: 1800 } // Кэш на 30 минут
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();

    return {
      temperature: Math.round(data.current.temperature_2m),
      condition: mapWeatherCode(data.current.weathercode),
      weatherCode: data.current.weathercode,
      windSpeed: Math.round(data.current.windspeed_10m),
      windDirection: data.current.winddirection_10m,
      humidity: data.current.relativehumidity_2m,
      location
    };
  } catch (error) {
    console.error('Error fetching weather from Open-Meteo:', error);
    
    // Возвращаем дефолтные данные при ошибке
    return {
      temperature: 0,
      condition: 'mostly_clear',
      weatherCode: 2,
      windSpeed: 5,
      windDirection: 180,
      humidity: 60,
      location
    };
  }
}

/**
 * Проверить нужен ли режим "вулканический пепел"
 * Для Камчатки: если холодно и сильный ветер
 */
export function checkVolcanicAsh(weather: WeatherData, isKamchatka: boolean): boolean {
  if (!isKamchatka) return false;
  
  // Если температура ниже 0 и ветер > 20 км/ч
  // И погода не совсем ясная
  return (
    weather.temperature < 0 &&
    weather.windSpeed > 20 &&
    weather.condition !== 'clear'
  );
}

/**
 * Получить emoji для погоды
 */
export function getWeatherEmoji(condition: string): string {
  const emojiMap: Record<string, string> = {
    clear: ' ',
    mostly_clear: '🌤️',
    partly_cloudy: '⛅',
    overcast: '☁️',
    fog: '🌫️',
    drizzle: ' ',
    rain: ' ',
    snow: ' ',
    thunderstorm: '⛈️',
  };
  
  return emojiMap[condition] || '🌤️';
}

/**
 * Получить описание погоды на русском
 */
export function getWeatherDescription(condition: string): string {
  const descriptionMap: Record<string, string> = {
    clear: 'Ясно',
    mostly_clear: 'В основном ясно',
    partly_cloudy: 'Переменная облачность',
    overcast: 'Пасмурно',
    fog: 'Туман',
    drizzle: 'Морось',
    rain: 'Дождь',
    snow: 'Снег',
    thunderstorm: 'Гроза',
  };
  
  return descriptionMap[condition] || 'Облачно';
}
