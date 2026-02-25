/**
 * Yandex Weather API Integration
 * API Key: берётся только из YANDEX_WEATHER_API_KEY
 * Docs: https://yandex.ru/dev/weather/doc/dg/concepts/about.html
 */

interface YandexWeatherResponse {
  now: number; // Timestamp
  now_dt: string; // DateTime
  info: {
    lat: number;
    lon: number;
    url: string;
  };
  fact: {
    obs_time: number;
    temp: number;
    feels_like: number;
    icon: string;
    condition: string;
    wind_speed: number;
    wind_dir: string;
    pressure_mm: number;
    humidity: number;
    daytime: string; // "d" or "n"
    polar: boolean;
    season: string;
    wind_gust: number;
  };
  forecast?: {
    date: string;
    date_ts: number;
    week: number;
    sunrise: string;
    sunset: string;
    moon_code: number;
    moon_text: string;
    parts: {
      day: WeatherPart;
      night: WeatherPart;
    };
  };
}

interface WeatherPart {
  temp_min: number;
  temp_max: number;
  temp_avg: number;
  feels_like: number;
  icon: string;
  condition: string;
  daytime: string;
  polar: boolean;
  wind_speed: number;
  wind_gust: number;
  wind_dir: string;
  pressure_mm: number;
  pressure_pa: number;
  humidity: number;
  prec_mm: number;
  prec_prob: number;
  prec_period: number;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  weatherCode: string;
  windSpeed: number;
  windDirection: string;
  windGust: number;
  humidity: number;
  pressure: number;
  daytime: 'day' | 'night';
  location: string;
  icon: string;
  forecast?: {
    sunrise: string;
    sunset: string;
    moonPhase: string;
  };
  timestamp: number;
}

/**
 * Маппинг условий Яндекс Погоды
 */
const CONDITION_MAP: Record<string, string> = {
  'clear': 'ясно',
  'partly-cloudy': 'малооблачно',
  'cloudy': 'облачно с прояснениями',
  'overcast': 'пасмурно',
  'drizzle': 'морось',
  'light-rain': 'небольшой дождь',
  'rain': 'дождь',
  'moderate-rain': 'умеренно сильный дождь',
  'heavy-rain': 'сильный дождь',
  'continuous-heavy-rain': 'длительный сильный дождь',
  'showers': 'ливень',
  'wet-snow': 'дождь со снегом',
  'light-snow': 'небольшой снег',
  'snow': 'снег',
  'snow-showers': 'снегопад',
  'hail': 'град',
  'thunderstorm': 'гроза',
  'thunderstorm-with-rain': 'дождь с грозой',
  'thunderstorm-with-hail': 'гроза с градом',
};

/**
 * Fetch weather from Yandex Weather API
 */
export async function fetchYandexWeather(
  lat: number = 53.0195,
  lon: number = 158.6505,
  lang: string = 'ru_RU'
): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.YANDEX_WEATHER_API_KEY;
    if (!apiKey) {
      console.warn('YANDEX_WEATHER_API_KEY is not configured');
      return null;
    }
    
    const url = `https://api.weather.yandex.ru/v2/informers?lat=${lat}&lon=${lon}&lang=${lang}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Yandex-API-Key': apiKey,
      },
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      console.error(`Yandex Weather API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: YandexWeatherResponse = await response.json();

    return {
      temperature: data.fact.temp,
      feelsLike: data.fact.feels_like,
      condition: CONDITION_MAP[data.fact.condition] || data.fact.condition,
      weatherCode: data.fact.condition,
      windSpeed: data.fact.wind_speed,
      windDirection: data.fact.wind_dir,
      windGust: data.fact.wind_gust,
      humidity: data.fact.humidity,
      pressure: data.fact.pressure_mm,
      daytime: data.fact.daytime === 'd' ? 'day' : 'night',
      location: 'Петропавловск-Камчатский',
      icon: data.fact.icon,
      forecast: data.forecast ? {
        sunrise: data.forecast.sunrise,
        sunset: data.forecast.sunset,
        moonPhase: data.forecast.moon_text,
      } : undefined,
      timestamp: data.now,
    };
  } catch (error) {
    console.error('Error fetching Yandex Weather:', error);
    return null;
  }
}

/**
 * Get time of day based on current hour
 */
export function getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Get Samsung Weather theme colors based on time and weather
 */
export function getSamsungWeatherTheme(timeOfDay: string, condition: string) {
  const themes = {
    morning: {
      gradient: 'linear-gradient(135deg, #B3D9F5 0%, #4A90E2 50%, #7FB4E8 100%)',
      primary: '#4A90E2',
      secondary: '#B3D9F5',
      text: '#ffffff',
    },
    day: {
      gradient: 'linear-gradient(135deg, #4A90E2 0%, #7FB4E8 50%, #B3D9F5 100%)',
      primary: '#4A90E2',
      secondary: '#7FB4E8',
      text: '#ffffff',
    },
    evening: {
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #9B59B6 50%, #3F51B5 100%)',
      primary: '#9B59B6',
      secondary: '#FF6B6B',
      text: '#ffffff',
    },
    night: {
      gradient: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 50%, #34495e 100%)',
      primary: '#2d3e50',
      secondary: '#34495e',
      text: '#ffffff',
    },
  };

  return themes[timeOfDay as keyof typeof themes] || themes.day;
}

/**
 * Check if weather needs special animation
 */
export function needsWeatherAnimation(condition: string): {
  rain: boolean;
  snow: boolean;
  wind: boolean;
  thunder: boolean;
} {
  return {
    rain: condition.includes('rain') || condition.includes('drizzle') || condition.includes('showers'),
    snow: condition.includes('snow'),
    wind: condition.includes('wind') || condition.includes('gust'),
    thunder: condition.includes('thunderstorm') || condition.includes('thunder'),
  };
}
