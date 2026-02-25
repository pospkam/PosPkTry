'use client';

import React, { useState, useEffect } from 'react';
import { Weather } from '@/types';
import { CloudSun, Cloud, CloudFog, CloudRain, Snowflake, CloudLightning, Droplets, Wind, Gauge, Sun, Moon, Sunrise, Sunset, Shirt } from 'lucide-react';

interface WeatherWidgetProps {
  lat?: number;
  lng?: number;
  location?: string;
  className?: string;
  showHourly?: boolean;
  showAlerts?: boolean;
}

export function WeatherWidget({ 
  lat = 53.0475, 
  lng = 158.6522, 
  location, 
  className,
  showHourly = true,
  showAlerts = true 
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'hourly' | 'forecast'>('current');

  useEffect(() => {
    fetchWeather();
  }, [lat, lng]);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}&location=${location || ''}`);
      const data = await response.json();
      
      if (data.success) {
        setWeather(data.data);
      } else {
        setError(data.error || 'Не удалось получить данные о погоде');
      }
    } catch (err) {
      setError('Ошибка при загрузке погоды');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const iconClass = 'w-12 h-12 text-gray-600';
    switch (condition) {
      case 'clear': return <Sun className={iconClass} />;
      case 'mostly_clear': return <CloudSun className={iconClass} />;
      case 'partly_cloudy': return <CloudSun className={iconClass} />;
      case 'overcast': return <Cloud className={iconClass} />;
      case 'fog': return <CloudFog className={iconClass} />;
      case 'drizzle': return <CloudRain className={iconClass} />;
      case 'rain': return <CloudRain className={iconClass} />;
      case 'showers': return <CloudRain className={iconClass} />;
      case 'snow': return <Snowflake className={iconClass} />;
      case 'thunderstorm': return <CloudLightning className={iconClass} />;
      default: return <CloudSun className={iconClass} />;
    }
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getUVIndexText = (index: number) => {
    if (index <= 2) return 'Низкий';
    if (index <= 5) return 'Умеренный';
    if (index <= 7) return 'Высокий';
    if (index <= 10) return 'Очень высокий';
    return 'Экстремальный';
  };

  const getUVIndexColor = (index: number) => {
    if (index <= 2) return 'text-green-600';
    if (index <= 5) return 'text-yellow-600';
    if (index <= 7) return 'text-orange-600';
    if (index <= 10) return 'text-red-600';
    return 'text-purple-600';
  };

  const getSafetyLevelBadge = (level: string) => {
    const badges: { [key: string]: { text: string; color: string } } = {
      'excellent': { text: 'Отлично', color: 'bg-green-100 text-green-800' },
      'good': { text: 'Хорошо', color: 'bg-blue-100 text-blue-800' },
      'moderate': { text: 'Умеренно', color: 'bg-yellow-100 text-yellow-800' },
      'difficult': { text: 'Сложно', color: 'bg-orange-100 text-orange-800' },
      'dangerous': { text: 'Опасно', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[level] || badges['moderate'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getComfortBadge = (index: number) => {
    if (index >= 80) return { text: 'Комфортно', color: 'bg-green-100 text-green-800' };
    if (index >= 60) return { text: 'Приемлемо', color: 'bg-blue-100 text-blue-800' };
    if (index >= 40) return { text: 'Терпимо', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Дискомфорт', color: 'bg-orange-100 text-orange-800' };
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="mb-2"><CloudSun className="w-10 h-10 text-gray-400 mx-auto" /></div>
          <div className="text-sm mb-3">{error}</div>
          <button
            onClick={fetchWeather}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  const comfortBadge = getComfortBadge(weather.comfortIndex);

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Погода</h3>
            <p className="text-sm opacity-90">{weather.location}</p>
          </div>
          <div className="text-right">
            {getSafetyLevelBadge(weather.safetyLevel)}
          </div>
        </div>
      </div>

      {/* Алерты */}
      {showAlerts && weather.alerts && weather.alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          {weather.alerts.map((alert) => (
            <div key={alert.event} className="mb-2 last:mb-0">
              <div className="flex items-start">
                <span className="text-red-600 mr-2">!</span>
                <div className="flex-1">
                  <p className="font-semibold text-red-800">{alert.event}</p>
                  <p className="text-sm text-red-700">{alert.description}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {new Date(alert.start).toLocaleString('ru-RU')} - {new Date(alert.end).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Табы */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'current'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Сейчас
        </button>
        {showHourly && weather.hourlyForecast && (
          <button
            onClick={() => setActiveTab('hourly')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'hourly'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            По часам
          </button>
        )}
        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'forecast'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Прогноз
        </button>
      </div>

      {/* Содержимое */}
      <div className="p-4">
        {activeTab === 'current' && (
          <div>
            {/* Текущая погода */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-2">
                {getWeatherIcon(weather.condition)}
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {weather.temperature}°C
              </div>
              <div className="text-sm text-gray-600 mb-1">
                Ощущается как {weather.feelsLike}°C
              </div>
              <div className="text-base text-gray-700 mb-2">
                {weather.conditionText}
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${comfortBadge.color}`}>
                {comfortBadge.text} • {weather.comfortIndex}%
              </span>
            </div>

            {/* Детали погоды */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <Droplets className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-gray-600">Влажность</div>
                  <div className="font-medium">{weather.humidity}%</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Wind className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-gray-600">Ветер</div>
                  <div className="font-medium">
                    {weather.windSpeed} км/ч {getWindDirection(weather.windDirection)}
                  </div>
                </div>
              </div>
              
              {weather.windGust && weather.windGust > weather.windSpeed && (
                <div className="flex items-center space-x-2 text-sm">
                  <Wind className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-gray-600">Порывы</div>
                    <div className="font-medium">{weather.windGust} км/ч</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm">
                <Gauge className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-gray-600">Давление</div>
                  <div className="font-medium">{weather.pressure} мм</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Sun className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-gray-600">Видимость</div>
                  <div className="font-medium">{weather.visibility} км</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Cloud className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-gray-600">Облачность</div>
                  <div className="font-medium">{weather.cloudCover}%</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Sun className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-gray-600">УФ-индекс</div>
                  <div className={`font-medium ${getUVIndexColor(weather.uvIndex)}`}>
                    {weather.uvIndex} ({getUVIndexText(weather.uvIndex)})
                  </div>
                </div>
              </div>

              {weather.dewPoint && (
                <div className="flex items-center space-x-2 text-sm">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-gray-600">Точка росы</div>
                    <div className="font-medium">{weather.dewPoint}°C</div>
                  </div>
                </div>
              )}
            </div>

            {/* Восход/закат */}
            {weather.sunrise && weather.sunset && (
              <div className="flex justify-around py-3 bg-amber-50 rounded-lg mb-4">
                <div className="text-center">
                  <div className="mb-1"><Sunrise className="w-6 h-6 text-amber-500 mx-auto" /></div>
                  <div className="text-xs text-gray-600">Восход</div>
                  <div className="text-sm font-medium">{formatTime(weather.sunrise)}</div>
                </div>
                <div className="text-center">
                  <div className="mb-1"><Sunset className="w-6 h-6 text-amber-500 mx-auto" /></div>
                  <div className="text-xs text-gray-600">Закат</div>
                  <div className="text-sm font-medium">{formatTime(weather.sunset)}</div>
                </div>
                {weather.moonPhase && (
                  <div className="text-center">
                    <div className="mb-1"><Moon className="w-6 h-6 text-slate-500 mx-auto" /></div>
                    <div className="text-xs text-gray-600">Луна</div>
                    <div className="text-sm font-medium">{weather.moonPhase}</div>
                  </div>
                )}
              </div>
            )}

            {/* Рекомендации */}
            <div className="space-y-3">
              {weather.tourAdvice && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="font-medium text-blue-900 mb-1">  Для туризма</div>
                  <div className="text-sm text-blue-800">{weather.tourAdvice}</div>
                </div>
              )}

              {weather.recommendations && weather.recommendations.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="font-medium text-yellow-900 mb-2">  Рекомендации</div>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {weather.recommendations.map((rec) => (
                      <li key={rec}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {weather.clothingAdvice && weather.clothingAdvice.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="font-medium text-purple-900 mb-2 flex items-center gap-2"><Shirt className="w-4 h-4" /> Что надеть</div>
                  <ul className="text-sm text-purple-800 space-y-1">
                    {weather.clothingAdvice.map((advice) => (
                      <li key={advice}>{advice}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hourly' && weather.hourlyForecast && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {weather.hourlyForecast.slice(0, 12).map((hour) => (
              <div key={hour.time} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getWeatherIcon(hour.condition)}</span>
                  <div>
                    <div className="text-sm font-medium">{formatTime(hour.time)}</div>
                    <div className="text-xs text-gray-500">
                      Ощущается {hour.feelsLike}°C
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{hour.temperature}°C</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Wind className="w-4 h-4" /> {hour.windSpeed} км/ч
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'forecast' && weather.forecast && (
          <div className="space-y-3">
            {weather.forecast.map((day, idx) => (
              <div key={String(day.date)} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getWeatherIcon(day.condition)}</span>
                  <div>
                    <div className="font-medium">
                      {idx === 0 ? 'Сегодня' : idx === 1 ? 'Завтра' : new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="text-sm text-gray-600">{day.conditionText}</div>
                    {day.precipitationProbability > 0 && (
                      <div className="text-xs text-blue-600 flex items-center gap-1">
                        <Droplets className="w-4 h-4" /> {day.precipitationProbability}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {day.temperature.max}° / {day.temperature.min}°
                  </div>
                  <div className="text-xs text-gray-500">
                    <Wind className="w-4 h-4 inline" /> {day.windSpeed} км/ч
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Время обновления */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t">
        Обновлено: {new Date(weather.lastUpdated).toLocaleString('ru-RU')}
      </div>
    </div>
  );
}
