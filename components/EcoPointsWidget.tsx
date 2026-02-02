'use client';

import React, { useState, useEffect } from 'react';
import { EcoPoint, UserEcoPoints } from '@/types';

interface EcoPointsWidgetProps {
  userId?: string;
  className?: string;
}

export function EcoPointsWidget({ userId, className }: EcoPointsWidgetProps) {
  const [userEcoPoints, setUserEcoPoints] = useState<UserEcoPoints | null>(null);
  const [nearbyEcoPoints, setNearbyEcoPoints] = useState<EcoPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserEcoPoints();
    }
    fetchNearbyEcoPoints();
  }, [userId]);

  const fetchUserEcoPoints = async () => {
    try {
      const response = await fetch(`/api/eco-points/user?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setUserEcoPoints(data.data);
      }
    } catch (err) {
      console.error('Error fetching user eco-points:', err);
    }
  };

  const fetchNearbyEcoPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Получаем текущее местоположение
      const position = await getCurrentPosition();
      
      const response = await fetch(
        `/api/eco-points?lat=${position.coords.latitude}&lng=${position.coords.longitude}&radius=5000`
      );
      const data = await response.json();
      
      if (data.success) {
        setNearbyEcoPoints(data.data);
      } else {
        setError(data.error || 'Не удалось получить Eco-points');
      }
    } catch (err) {
      setError('Ошибка при загрузке Eco-points');
      console.error('Eco-points fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'recycling':
        return '';
      case 'cleaning':
        return '';
      case 'conservation':
        return '';
      case 'education':
        return '';
      default:
        return '';
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'recycling':
        return 'Переработка';
      case 'cleaning':
        return 'Уборка';
      case 'conservation':
        return 'Сохранение';
      case 'education':
        return 'Образование';
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'recycling':
        return 'bg-green-100 text-green-800';
      case 'cleaning':
        return 'bg-blue-100 text-blue-800';
      case 'conservation':
        return 'bg-emerald-100 text-emerald-800';
      case 'education':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelInfo = (level: number) => {
    if (level >= 5) return { name: 'Мастер экологии', color: 'text-purple-600' };
    if (level >= 4) return { name: 'Эко-гуру', color: 'text-indigo-600' };
    if (level >= 3) return { name: 'Защитник природы', color: 'text-green-600' };
    if (level >= 2) return { name: 'Экологический активист', color: 'text-blue-600' };
    return { name: 'Новичок', color: 'text-gray-600' };
  };

  const getProgressToNextLevel = (totalPoints: number, level: number) => {
    const levelThresholds = [0, 10, 50, 200, 500, 1000];
    const currentThreshold = levelThresholds[level - 1] || 0;
    const nextThreshold = levelThresholds[level] || 1000;
    const progress = ((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2"></div>
          <div className="text-sm">{error}</div>
          <button
            onClick={fetchNearbyEcoPoints}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Eco-points</h3>
        <div className="text-sm text-gray-500">
          {nearbyEcoPoints.length} точек рядом
        </div>
      </div>

      {/* Пользовательские очки */}
      {userEcoPoints && (
        <div className="mb-6 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-gray-900">
              {userEcoPoints.totalPoints}
            </div>
            <div className="text-sm text-gray-600">
              Уровень {userEcoPoints.level}
            </div>
          </div>
          
          <div className="text-sm font-medium text-gray-700 mb-1">
            {getLevelInfo(userEcoPoints.level).name}
          </div>
          
          {/* Прогресс до следующего уровня */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressToNextLevel(userEcoPoints.totalPoints, userEcoPoints.level)}%` }}
            ></div>
          </div>
          
          <div className="text-xs text-gray-500">
            До следующего уровня: {1000 - userEcoPoints.totalPoints} очков
          </div>
        </div>
      )}

      {/* Ближайшие Eco-points */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Ближайшие точки</h4>
        
        {nearbyEcoPoints.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <div className="text-2xl mb-2"></div>
            <div className="text-sm">Нет Eco-points поблизости</div>
          </div>
        ) : (
          nearbyEcoPoints.slice(0, 3).map((ecoPoint) => (
            <div
              key={ecoPoint.id}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
            >
              <div className="text-2xl">
                {getCategoryIcon(ecoPoint.category)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {ecoPoint.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {ecoPoint.description}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(ecoPoint.category)}`}
                >
                  {getCategoryText(ecoPoint.category)}
                </span>
                <span className="text-sm font-medium text-green-600">
                  +{ecoPoint.points}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Кнопка "Показать все" */}
      {nearbyEcoPoints.length > 3 && (
        <button
          className="w-full mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={() => {
            // Здесь будет логика показа всех Eco-points
          }}
        >
          Показать все ({nearbyEcoPoints.length})
        </button>
      )}

      {/* Достижения */}
      {userEcoPoints && userEcoPoints.achievements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Достижения</h4>
          <div className="space-y-2">
            {userEcoPoints.achievements.slice(0, 3).map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center space-x-2 text-sm"
              >
                <span className="text-yellow-500"></span>
                <span className="text-gray-700">{achievement.name}</span>
                <span className="text-green-600 font-medium">
                  +{achievement.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}