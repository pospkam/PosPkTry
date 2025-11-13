import { NextRequest, NextResponse } from 'next/server';
import { Weather, WeatherForecast, WeatherHourly, WeatherAlert, ApiResponse } from '@/types';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

// GET /api/weather - Получение данных о погоде
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const location = searchParams.get('location');
    const provider = searchParams.get('provider') || config.weather.defaultProvider;

    if (!lat || !lng) {
      return NextResponse.json({
        success: false,
        error: 'Latitude and longitude are required',
      } as ApiResponse<null>, { status: 400 });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Проверяем валидность координат
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid coordinates',
      } as ApiResponse<null>, { status: 400 });
    }

    // Получаем данные о погоде
    const weather = await getWeatherData(latitude, longitude, location || undefined, provider);

    return NextResponse.json({
      success: true,
      data: weather,
    } as ApiResponse<Weather>);

  } catch (error) {
    console.error('Error fetching weather:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch weather data',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}

// Главная функция получения погоды с fallback
async function getWeatherData(
  lat: number, 
  lng: number, 
  location?: string,
  preferredProvider: string = 'openMeteo'
): Promise<Weather> {
  const providers = [preferredProvider, 'openMeteo', 'weatherApi', 'openWeatherMap', 'yandex'];
  const uniqueProviders = [...new Set(providers)];

  for (const provider of uniqueProviders) {
    try {
      console.log(`Trying weather provider: ${provider}`);
      
      switch (provider) {
        case 'openMeteo':
          return await getOpenMeteoWeather(lat, lng, location);
        case 'openWeatherMap':
          if (config.weather.openWeatherMap.apiKey) {
            return await getOpenWeatherMapData(lat, lng, location);
          }
          break;
        case 'weatherApi':
          if (config.weather.weatherApi.apiKey) {
            return await getWeatherApiData(lat, lng, location);
          }
          break;
        case 'yandex':
          if (config.weather.yandex.apiKey) {
            return await getYandexWeather(lat, lng, location);
          }
          break;
      }
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);
      continue;
    }
  }

  // Если все провайдеры не работают, возвращаем данные по умолчанию
  return getDefaultWeather(lat, lng, location);
}

// ===== OPEN-METEO (бесплатный, надежный) =====
async function getOpenMeteoWeather(lat: number, lng: number, location?: string): Promise<Weather> {
  const url = `${config.weather.openMeteo.baseUrl}/forecast?` +
    `latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,visibility,wind_speed_10m,uv_index` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max` +
    `&timezone=auto&forecast_days=7`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': 'Kamchatour Hub/2.0' },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data = await response.json();
  const current = data.current;
  const hourly = data.hourly;
  const daily = data.daily;

  // Почасовой прогноз (следующие 24 часа)
  const hourlyForecast: WeatherHourly[] = [];
  for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
    hourlyForecast.push({
      time: hourly.time[i],
      temperature: Math.round(hourly.temperature_2m[i]),
      feelsLike: Math.round(hourly.apparent_temperature[i]),
      condition: getWeatherCondition(hourly.weather_code[i]),
      precipitation: hourly.precipitation[i] || 0,
      windSpeed: Math.round(hourly.wind_speed_10m[i] * 3.6),
      humidity: hourly.relative_humidity_2m[i],
    });
  }

  // Дневной прогноз
  const forecast: WeatherForecast[] = [];
  for (let i = 0; i < Math.min(7, daily.time.length); i++) {
    forecast.push({
      date: new Date(daily.time[i]),
      temperature: {
        min: Math.round(daily.temperature_2m_min[i]),
        max: Math.round(daily.temperature_2m_max[i]),
      },
      condition: getWeatherCondition(daily.weather_code[i]),
      conditionText: getWeatherConditionText(getWeatherCondition(daily.weather_code[i])),
      precipitation: daily.precipitation_sum[i] || 0,
      precipitationProbability: daily.precipitation_probability_max[i] || 0,
      windSpeed: Math.round(daily.wind_speed_10m_max[i] * 3.6),
      humidity: 60, // Open-Meteo не дает дневную влажность
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
    });
  }

  const currentCondition = getWeatherCondition(current.weather_code);
  const temp = Math.round(current.temperature_2m);
  const feelsLike = Math.round(current.apparent_temperature);
  const windSpeed = Math.round(current.wind_speed_10m * 3.6);
  const windGust = current.wind_gusts_10m ? Math.round(current.wind_gusts_10m * 3.6) : undefined;

  const weather: Weather = {
    location: location || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    temperature: temp,
    feelsLike: feelsLike,
    condition: currentCondition,
    conditionText: getWeatherConditionText(currentCondition),
    humidity: current.relative_humidity_2m,
    windSpeed: windSpeed,
    windDirection: current.wind_direction_10m,
    windGust: windGust,
    pressure: Math.round(current.pressure_msl),
    visibility: 10, // Open-Meteo не дает текущую видимость
    uvIndex: Math.round(hourly.uv_index[0] || 0),
    cloudCover: current.cloud_cover,
    forecast: forecast,
    hourlyForecast: hourlyForecast,
    lastUpdated: new Date(),
    safetyLevel: calculateSafetyLevel(currentCondition, windSpeed, 10, temp),
    recommendations: getWeatherRecommendations(currentCondition, windSpeed, 10, temp),
    clothingAdvice: getClothingAdvice(temp, feelsLike, currentCondition, windSpeed),
    tourAdvice: getTourAdvice(currentCondition, windSpeed, temp),
    comfortIndex: calculateComfortIndex(temp, feelsLike, current.relative_humidity_2m, windSpeed, currentCondition),
  };

  return weather;
}

// ===== OPENWEATHERMAP =====
async function getOpenWeatherMapData(lat: number, lng: number, location?: string): Promise<Weather> {
  const apiKey = config.weather.openWeatherMap.apiKey;
  
  // Текущая погода + почасовой + дневной прогноз
  const url = `${config.weather.openWeatherMap.baseUrl}/onecall?` +
    `lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=ru&exclude=minutely`;

  const response = await fetch(url, {
    next: { revalidate: 1800 },
    headers: { 'User-Agent': 'Kamchatour Hub/2.0' },
  });

  if (!response.ok) {
    throw new Error(`OpenWeatherMap API error: ${response.status}`);
  }

  const data = await response.json();
  const current = data.current;

  // Почасовой прогноз
  const hourlyForecast: WeatherHourly[] = data.hourly.slice(0, 24).map((hour: any) => ({
    time: new Date(hour.dt * 1000).toISOString(),
    temperature: Math.round(hour.temp),
    feelsLike: Math.round(hour.feels_like),
    condition: mapOpenWeatherCondition(hour.weather[0].main),
    precipitation: hour.rain?.['1h'] || hour.snow?.['1h'] || 0,
    windSpeed: Math.round(hour.wind_speed * 3.6),
    humidity: hour.humidity,
  }));

  // Дневной прогноз
  const forecast: WeatherForecast[] = data.daily.slice(0, 7).map((day: any) => ({
    date: new Date(day.dt * 1000),
    temperature: {
      min: Math.round(day.temp.min),
      max: Math.round(day.temp.max),
    },
    condition: mapOpenWeatherCondition(day.weather[0].main),
    conditionText: day.weather[0].description,
    precipitation: (day.rain || 0) + (day.snow || 0),
    precipitationProbability: (day.pop || 0) * 100,
    windSpeed: Math.round(day.wind_speed * 3.6),
    humidity: day.humidity,
    sunrise: new Date(day.sunrise * 1000).toISOString(),
    sunset: new Date(day.sunset * 1000).toISOString(),
  }));

  // Алерты
  const alerts: WeatherAlert[] = (data.alerts || []).map((alert: any) => ({
    event: alert.event,
    severity: 'moderate' as const,
    urgency: 'expected' as const,
    description: alert.description,
    start: new Date(alert.start * 1000),
    end: new Date(alert.end * 1000),
  }));

  const condition = mapOpenWeatherCondition(current.weather[0].main);
  const temp = Math.round(current.temp);
  const feelsLike = Math.round(current.feels_like);
  const windSpeed = Math.round(current.wind_speed * 3.6);

  return {
    location: location || data.timezone,
    temperature: temp,
    feelsLike: feelsLike,
    condition: condition,
    conditionText: current.weather[0].description,
    humidity: current.humidity,
    windSpeed: windSpeed,
    windDirection: current.wind_deg,
    windGust: current.wind_gust ? Math.round(current.wind_gust * 3.6) : undefined,
    pressure: Math.round(current.pressure * 0.75), // hPa -> mmHg
    visibility: Math.round(current.visibility / 1000),
    uvIndex: Math.round(current.uvi),
    cloudCover: current.clouds,
    dewPoint: Math.round(current.dew_point),
    sunrise: new Date(current.sunrise * 1000).toISOString(),
    sunset: new Date(current.sunset * 1000).toISOString(),
    forecast: forecast,
    hourlyForecast: hourlyForecast,
    alerts: alerts.length > 0 ? alerts : undefined,
    lastUpdated: new Date(),
    safetyLevel: calculateSafetyLevel(condition, windSpeed, current.visibility / 1000, temp),
    recommendations: getWeatherRecommendations(condition, windSpeed, current.visibility / 1000, temp),
    clothingAdvice: getClothingAdvice(temp, feelsLike, condition, windSpeed),
    tourAdvice: getTourAdvice(condition, windSpeed, temp),
    comfortIndex: calculateComfortIndex(temp, feelsLike, current.humidity, windSpeed, condition),
  };
}

// ===== WEATHERAPI.COM =====
async function getWeatherApiData(lat: number, lng: number, location?: string): Promise<Weather> {
  const apiKey = config.weather.weatherApi.apiKey;
  const url = `${config.weather.weatherApi.baseUrl}/forecast.json?` +
    `key=${apiKey}&q=${lat},${lng}&days=7&aqi=yes&alerts=yes&lang=ru`;

  const response = await fetch(url, { next: { revalidate: 1800 } });
  
  if (!response.ok) {
    throw new Error(`WeatherAPI error: ${response.status}`);
  }

  const data = await response.json();
  const current = data.current;
  const location_data = data.location;

  // Почасовой прогноз (24 часа)
  const hourlyForecast: WeatherHourly[] = data.forecast.forecastday[0].hour.map((hour: any) => ({
    time: hour.time,
    temperature: Math.round(hour.temp_c),
    feelsLike: Math.round(hour.feelslike_c),
    condition: mapWeatherApiCondition(hour.condition.code),
    precipitation: hour.precip_mm,
    windSpeed: Math.round(hour.wind_kph),
    humidity: hour.humidity,
  }));

  // Дневной прогноз
  const forecast: WeatherForecast[] = data.forecast.forecastday.map((day: any) => ({
    date: new Date(day.date),
    temperature: {
      min: Math.round(day.day.mintemp_c),
      max: Math.round(day.day.maxtemp_c),
    },
    condition: mapWeatherApiCondition(day.day.condition.code),
    conditionText: day.day.condition.text,
    precipitation: day.day.totalprecip_mm,
    precipitationProbability: day.day.daily_chance_of_rain || day.day.daily_chance_of_snow,
    windSpeed: Math.round(day.day.maxwind_kph),
    humidity: day.day.avghumidity,
    sunrise: day.astro.sunrise,
    sunset: day.astro.sunset,
  }));

  // Алерты
  const alerts: WeatherAlert[] | undefined = data.alerts?.alert?.map((alert: any) => ({
    event: alert.event,
    severity: alert.severity?.toLowerCase() || 'moderate',
    urgency: alert.urgency?.toLowerCase() || 'expected',
    description: alert.desc,
    start: new Date(alert.effective),
    end: new Date(alert.expires),
  }));

  const condition = mapWeatherApiCondition(current.condition.code);
  const temp = Math.round(current.temp_c);
  const feelsLike = Math.round(current.feelslike_c);
  const windSpeed = Math.round(current.wind_kph);

  return {
    location: location || `${location_data.name}, ${location_data.region}`,
    temperature: temp,
    feelsLike: feelsLike,
    condition: condition,
    conditionText: current.condition.text,
    humidity: current.humidity,
    windSpeed: windSpeed,
    windDirection: current.wind_degree,
    windGust: Math.round(current.gust_kph),
    pressure: Math.round(current.pressure_mb * 0.75),
    visibility: current.vis_km,
    uvIndex: Math.round(current.uv),
    cloudCover: current.cloud,
    dewPoint: Math.round(current.dewpoint_c),
    sunrise: data.forecast.forecastday[0].astro.sunrise,
    sunset: data.forecast.forecastday[0].astro.sunset,
    moonPhase: data.forecast.forecastday[0].astro.moon_phase,
    forecast: forecast,
    hourlyForecast: hourlyForecast,
    alerts: alerts,
    lastUpdated: new Date(current.last_updated),
    safetyLevel: calculateSafetyLevel(condition, windSpeed, current.vis_km, temp),
    recommendations: getWeatherRecommendations(condition, windSpeed, current.vis_km, temp),
    clothingAdvice: getClothingAdvice(temp, feelsLike, condition, windSpeed),
    tourAdvice: getTourAdvice(condition, windSpeed, temp),
    comfortIndex: calculateComfortIndex(temp, feelsLike, current.humidity, windSpeed, condition),
  };
}

// ===== YANDEX WEATHER =====
async function getYandexWeather(lat: number, lng: number, location?: string): Promise<Weather> {
  const url = `${config.weather.yandex.baseUrl}/forecast?lat=${lat}&lon=${lng}&lang=ru_RU&limit=7&hours=true&extra=true`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'X-Yandex-API-Key': config.weather.yandex.apiKey },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`Yandex Weather API error: ${response.status}`);
  }

  const data = await response.json();
  const fact = data.fact;
  
  const condition = mapYandexCondition(fact.condition);
  const temp = fact.temp;
  const feelsLike = fact.feels_like;
  const windSpeed = Math.round(fact.wind_speed * 3.6);

  return {
    location: location || data.geo_object?.locality?.name || data.info?.tzinfo?.name,
    temperature: temp,
    feelsLike: feelsLike,
    condition: condition,
    conditionText: fact.condition,
    humidity: fact.humidity,
    windSpeed: windSpeed,
    windDirection: windDirToAngle(fact.wind_dir),
    pressure: fact.pressure_mm,
    visibility: fact.visibility || 10,
    uvIndex: fact.uv_index || 0,
    cloudCover: fact.cloudness * 12.5, // Yandex дает 0-8, конвертируем в %
    sunrise: data.forecast?.parts?.[0]?.sunrise,
    sunset: data.forecast?.parts?.[0]?.sunset,
    forecast: data.forecasts?.map((day: any) => ({
      date: new Date(day.date),
      temperature: {
        min: day.parts.day.temp_min,
        max: day.parts.day.temp_max,
      },
      condition: mapYandexCondition(day.parts.day.condition),
      conditionText: day.parts.day.condition,
      precipitation: day.parts.day.prec_mm,
      precipitationProbability: day.parts.day.prec_prob,
      windSpeed: Math.round(day.parts.day.wind_speed * 3.6),
      humidity: day.parts.day.humidity,
    })) || [],
    lastUpdated: new Date(fact.obs_time * 1000),
    safetyLevel: calculateSafetyLevel(condition, windSpeed, fact.visibility || 10, temp),
    recommendations: getWeatherRecommendations(condition, windSpeed, fact.visibility || 10, temp),
    clothingAdvice: getClothingAdvice(temp, feelsLike, condition, windSpeed),
    tourAdvice: getTourAdvice(condition, windSpeed, temp),
    comfortIndex: calculateComfortIndex(temp, feelsLike, fact.humidity, windSpeed, condition),
  };
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

function getDefaultWeather(lat: number, lng: number, location?: string): Weather {
  return {
    location: location || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    temperature: 15,
    feelsLike: 15,
    condition: 'partly_cloudy',
    conditionText: 'Переменная облачность',
    humidity: 60,
    windSpeed: 10,
    windDirection: 180,
    pressure: 760,
    visibility: 10,
    uvIndex: 3,
    cloudCover: 50,
    forecast: [{
      date: new Date(),
      temperature: { min: 10, max: 20 },
      condition: 'partly_cloudy',
      conditionText: 'Переменная облачность',
      precipitation: 0,
      precipitationProbability: 20,
      windSpeed: 10,
      humidity: 60,
    }],
    lastUpdated: new Date(),
    safetyLevel: 'good',
    recommendations: ['Данные погоды временно недоступны'],
    clothingAdvice: ['Рекомендуется одеваться по сезону'],
    tourAdvice: 'Проверьте актуальный прогноз перед выходом',
    comfortIndex: 70,
  };
}

// Маппинг условий Open-Meteo (WMO коды)
function getWeatherCondition(code: number): string {
  const conditions: { [key: number]: string } = {
    0: 'clear', 1: 'mostly_clear', 2: 'partly_cloudy', 3: 'overcast',
    45: 'fog', 48: 'fog',
    51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
    61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
    71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
    80: 'showers', 81: 'showers', 82: 'showers',
    85: 'snow', 86: 'snow',
    95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm',
  };
  return conditions[code] || 'unknown';
}

function getWeatherConditionText(condition: string): string {
  const texts: { [key: string]: string } = {
    'clear': 'Ясно',
    'mostly_clear': 'В основном ясно',
    'partly_cloudy': 'Переменная облачность',
    'overcast': 'Пасмурно',
    'fog': 'Туман',
    'drizzle': 'Морось',
    'rain': 'Дождь',
    'showers': 'Ливень',
    'snow': 'Снег',
    'thunderstorm': 'Гроза',
    'unknown': 'Неизвестно',
  };
  return texts[condition] || condition;
}

// Маппинг OpenWeatherMap
function mapOpenWeatherCondition(main: string): string {
  const map: { [key: string]: string } = {
    'Clear': 'clear',
    'Clouds': 'partly_cloudy',
    'Rain': 'rain',
    'Drizzle': 'drizzle',
    'Thunderstorm': 'thunderstorm',
    'Snow': 'snow',
    'Mist': 'fog', 'Smoke': 'fog', 'Haze': 'fog', 'Fog': 'fog',
  };
  return map[main] || 'partly_cloudy';
}

// Маппинг WeatherAPI коды
function mapWeatherApiCondition(code: number): string {
  if (code === 1000) return 'clear';
  if ([1003, 1006].includes(code)) return 'partly_cloudy';
  if (code === 1009) return 'overcast';
  if ([1030, 1135, 1147].includes(code)) return 'fog';
  if ([1063, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246].includes(code)) return 'rain';
  if ([1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(code)) return 'snow';
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 'thunderstorm';
  return 'partly_cloudy';
}

// Маппинг Yandex
function mapYandexCondition(condition: string): string {
  const map: { [key: string]: string } = {
    'clear': 'clear',
    'partly-cloudy': 'partly_cloudy',
    'cloudy': 'overcast',
    'overcast': 'overcast',
    'drizzle': 'drizzle',
    'light-rain': 'rain',
    'rain': 'rain',
    'moderate-rain': 'rain',
    'heavy-rain': 'showers',
    'continuous-heavy-rain': 'showers',
    'showers': 'showers',
    'wet-snow': 'snow',
    'light-snow': 'snow',
    'snow': 'snow',
    'snow-showers': 'snow',
    'hail': 'snow',
    'thunderstorm': 'thunderstorm',
    'thunderstorm-with-rain': 'thunderstorm',
    'thunderstorm-with-hail': 'thunderstorm',
  };
  return map[condition] || 'partly_cloudy';
}

// Направление ветра из текста в градусы
function windDirToAngle(dir: string): number {
  const map: { [key: string]: number } = {
    'n': 0, 'nne': 22.5, 'ne': 45, 'ene': 67.5,
    'e': 90, 'ese': 112.5, 'se': 135, 'sse': 157.5,
    's': 180, 'ssw': 202.5, 'sw': 225, 'wsw': 247.5,
    'w': 270, 'wnw': 292.5, 'nw': 315, 'nnw': 337.5,
    'c': 0, // calm
  };
  return map[dir.toLowerCase()] || 0;
}

// Расчет уровня безопасности для туризма
function calculateSafetyLevel(
  condition: string,
  windSpeed: number,
  visibility: number,
  temp: number
): 'excellent' | 'good' | 'moderate' | 'difficult' | 'dangerous' {
  // Опасные условия
  if (
    condition === 'thunderstorm' ||
    windSpeed > 60 ||
    visibility < 0.5 ||
    temp < -30 ||
    temp > 45
  ) {
    return 'dangerous';
  }

  // Сложные условия
  if (
    condition === 'showers' ||
    windSpeed > 40 ||
    visibility < 2 ||
    temp < -20 ||
    temp > 40
  ) {
    return 'difficult';
  }

  // Умеренные условия
  if (
    condition === 'rain' ||
    condition === 'snow' ||
    windSpeed > 25 ||
    visibility < 5 ||
    temp < -10
  ) {
    return 'moderate';
  }

  // Хорошие условия
  if (
    condition === 'partly_cloudy' ||
    condition === 'overcast' ||
    condition === 'drizzle' ||
    windSpeed > 15
  ) {
    return 'good';
  }

  // Отличные условия
  return 'excellent';
}

// Рекомендации по погоде для туристов
function getWeatherRecommendations(
  condition: string,
  windSpeed: number,
  visibility: number,
  temp: number
): string[] {
  const recommendations: string[] = [];

  // Критические условия
  if (condition === 'thunderstorm') {
    recommendations.push('⛈️ ОПАСНО: Гроза! Все туры отменены');
    recommendations.push('🏠 Оставайтесь в помещении');
    return recommendations;
  }

  if (windSpeed > 60) {
    recommendations.push('💨 ОПАСНО: Ураганный ветер! Не выходите на улицу');
    return recommendations;
  }

  if (visibility < 0.5) {
    recommendations.push('🌫️ ОПАСНО: Нулевая видимость, туры отменены');
    return recommendations;
  }

  if (temp < -30) {
    recommendations.push('🥶 ОПАСНО: Экстремальный мороз! Избегайте длительного пребывания на улице');
    return recommendations;
  }

  // Предупреждения
  if (windSpeed > 40) {
    recommendations.push('💨 Очень сильный ветер - ограничения для горных туров');
  } else if (windSpeed > 25) {
    recommendations.push('💨 Сильный ветер - будьте осторожны');
  }

  if (visibility < 2) {
    recommendations.push('🌫️ Плохая видимость - соблюдайте осторожность');
  }

  if (condition === 'rain' || condition === 'showers') {
    recommendations.push('  Дождь - возьмите непромокаемую одежду');
  } else if (condition === 'snow') {
    recommendations.push('  Снег - теплая одежда обязательна');
  } else if (condition === 'drizzle') {
    recommendations.push('  Морось - легкий дождевик пригодится');
  }

  if (temp < -10) {
    recommendations.push('🧊 Сильный мороз - теплая зимняя одежда');
  } else if (temp > 30) {
    recommendations.push('  Жара - не забывайте пить воду');
  }

  // Благоприятные условия
  if (recommendations.length === 0) {
    if (condition === 'clear') {
      recommendations.push('  Отличная погода для всех видов туров!');
    } else if (condition === 'mostly_clear') {
      recommendations.push('🌤️ Хорошая погода для туризма');
    } else {
      recommendations.push('⛅ Подходящие условия для большинства туров');
    }
  }

  return recommendations;
}

// Рекомендации по одежде
function getClothingAdvice(
  temp: number,
  feelsLike: number,
  condition: string,
  windSpeed: number
): string[] {
  const advice: string[] = [];

  // Базовая одежда по температуре
  if (feelsLike < -20) {
    advice.push('🧥 Утепленная зимняя куртка и термобелье');
    advice.push('🧤 Теплые перчатки и шапка-ушанка');
    advice.push('👢 Утепленная обувь');
  } else if (feelsLike < -10) {
    advice.push('🧥 Зимняя куртка и теплые слои');
    advice.push('🧤 Перчатки и шапка');
  } else if (feelsLike < 0) {
    advice.push('🧥 Теплая куртка');
    advice.push('🧤 Легкие перчатки и шапка');
  } else if (feelsLike < 10) {
    advice.push('🧥 Ветровка или легкая куртка');
  } else if (feelsLike < 20) {
    advice.push('👕 Легкая кофта или свитер');
  } else if (feelsLike < 25) {
    advice.push('👕 Футболка и легкая одежда');
  } else {
    advice.push('🩳 Легкая летняя одежда');
    advice.push('🧢 Головной убор от солнца');
  }

  // Дополнительно по условиям
  if (condition.includes('rain') || condition === 'showers') {
    advice.push('☔ Дождевик или зонт');
    advice.push('👢 Водонепроницаемая обувь');
  }

  if (condition === 'snow') {
    advice.push('👢 Зимние ботинки с хорошим протектором');
  }

  if (windSpeed > 30) {
    advice.push('🧥 Ветрозащитная верхняя одежда');
  }

  return advice;
}

// Советы для туристов
function getTourAdvice(condition: string, windSpeed: number, temp: number): string {
  if (condition === 'thunderstorm' || windSpeed > 60 || temp < -30) {
    return '🚫 Туристическая активность не рекомендуется';
  }

  if (condition === 'showers' || windSpeed > 40 || temp < -20) {
    return '! Ограниченная туристическая активность, только опытные группы';
  }

  if (condition === 'rain' || condition === 'snow' || windSpeed > 25) {
    return '⛅ Возможны туры с ограничениями, требуется специальное снаряжение';
  }

  if (condition === 'clear' || condition === 'mostly_clear') {
    return '[✓] Идеальные условия для всех видов туров!';
  }

  return '👍 Хорошие условия для большинства туристических маршрутов';
}

// Индекс комфорта (0-100)
function calculateComfortIndex(
  temp: number,
  feelsLike: number,
  humidity: number,
  windSpeed: number,
  condition: string
): number {
  let index = 100;

  // Температурный дискомфорт
  const tempDiff = Math.abs(temp - 20); // Идеал 20°C
  index -= tempDiff * 2;

  // Ощущаемая температура
  const feelsLikeDiff = Math.abs(feelsLike - 20);
  index -= feelsLikeDiff * 1.5;

  // Влажность (идеал 50-60%)
  if (humidity < 40 || humidity > 70) {
    index -= Math.abs(humidity - 55) * 0.5;
  }

  // Ветер
  if (windSpeed > 20) {
    index -= (windSpeed - 20) * 0.5;
  }

  // Условия
  if (condition === 'thunderstorm') index -= 50;
  else if (condition === 'showers') index -= 30;
  else if (condition === 'rain') index -= 20;
  else if (condition === 'snow') index -= 15;
  else if (condition === 'drizzle') index -= 10;
  else if (condition === 'fog') index -= 15;

  return Math.max(0, Math.min(100, Math.round(index)));
}
