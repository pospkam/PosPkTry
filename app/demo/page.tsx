'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [demoUser, setDemoUser] = useState<any>(null);

  useEffect(() => {
    // Создаем демо-пользователя
    const demoUserData = {
      id: 'demo_user_123',
      name: 'Демо Пользователь',
      email: 'demo@kamchatour.ru',
      role: 'tourist',
      avatar: '/api/placeholder/64/64',
      isDemo: true
    };

    // Сохраняем в localStorage для демо-режима
    localStorage.setItem('demo_user', JSON.stringify(demoUserData));
    localStorage.setItem('demo_mode', 'true');
    
    setDemoUser(demoUserData);
    setIsLoading(false);
  }, []);

  const handleStartDemo = (role: string) => {
    const updatedUser = { ...demoUser, role };
    localStorage.setItem('demo_user', JSON.stringify(updatedUser));
    
    // Перенаправляем в соответствующий дашборд
    switch (role) {
      case 'tourist':
        router.push('/hub/tourist');
        break;
      case 'operator':
        router.push('/hub/operator');
        break;
      case 'transfer-operator':
        router.push('/hub/transfer-operator');
        break;
      case 'guide':
        router.push('/hub/guide');
        break;
      default:
        router.push('/hub/tourist');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/40 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загружаем демо-режим...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl bg-gold-gradient mx-auto mb-6"></div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Демо-режим Kamchatour Hub
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Выберите роль для просмотра функциональности
          </p>
        </div>

        {/* Роли */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Турист */}
          <div className="bg-transparent/90 backdrop-blur-sm rounded-2xl p-6 border border-white/40/20 hover:border-white/40/40 transition-all cursor-pointer group" onClick={() => handleStartDemo('tourist')}>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                <span className="text-2xl">🧳</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Турист</h3>
              <p className="text-gray-400 text-sm mb-4">
                Поиск туров, трансферов, прогноз погоды, AI-помощник
              </p>
              <div className="text-xs text-gray-500">
                • Поиск трансферов<br/>
                • Система лояльности<br/>
                • Бронирование
              </div>
            </div>
          </div>

          {/* Туроператор */}
          <div className="bg-transparent/90 backdrop-blur-sm rounded-2xl p-6 border border-white/40/20 hover:border-white/40/40 transition-all cursor-pointer group" onClick={() => handleStartDemo('operator')}>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30 transition-colors">
                <span className="text-2xl">🏢</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Туроператор</h3>
              <p className="text-gray-400 text-sm mb-4">
                CRM система, управление турами, аналитика
              </p>
              <div className="text-xs text-gray-500">
                • Управление турами<br/>
                • Статистика<br/>
                • Бронирования
              </div>
            </div>
          </div>

          {/* Оператор трансферов */}
          <div className="bg-transparent/90 backdrop-blur-sm rounded-2xl p-6 border border-white/40/20 hover:border-white/40/40 transition-all cursor-pointer group" onClick={() => handleStartDemo('transfer-operator')}>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/30 transition-colors">
                <span className="text-2xl">🚌</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Оператор трансферов</h3>
              <p className="text-gray-400 text-sm mb-4">
                Управление водителями, заказами, аналитика
              </p>
              <div className="text-xs text-gray-500">
                • Управление водителями<br/>
                • Активные заказы<br/>
                • Платежи
              </div>
            </div>
          </div>

          {/* Гид */}
          <div className="bg-transparent/90 backdrop-blur-sm rounded-2xl p-6 border border-white/40/20 hover:border-white/40/40 transition-all cursor-pointer group" onClick={() => handleStartDemo('guide')}>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500/30 transition-colors">
                <span className="text-2xl">🗺️</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Гид</h3>
              <p className="text-gray-400 text-sm mb-4">
                Расписание, группы, заработок, профиль
              </p>
              <div className="text-xs text-gray-500">
                • Расписание<br/>
                • Группы<br/>
                • Заработок
              </div>
            </div>
          </div>
        </div>

        {/* Информация о демо-режиме */}
        <div className="bg-transparent/90 backdrop-blur-sm rounded-2xl p-6 border border-white/40/20">
          <h3 className="text-xl font-semibold text-white mb-4">ℹ️ О демо-режиме</h3>
          <div className="space-y-3 text-gray-300">
            <p>• <strong className="text-white">Данные:</strong> Используются демо-данные для демонстрации функциональности</p>
            <p>• <strong className="text-white">API:</strong> Работают с заглушками, реальные API ключи не требуются</p>
            <p>• <strong className="text-white">Функции:</strong> Все основные функции доступны для просмотра</p>
            <p>• <strong className="text-white">Безопасность:</strong> Демо-режим не влияет на реальные данные</p>
          </div>
        </div>

        {/* Кнопка выхода из демо */}
        <div className="text-center mt-8">
          <button 
            onClick={() => {
              localStorage.removeItem('demo_user');
              localStorage.removeItem('demo_mode');
              router.push('/');
            }}
            className="px-6 py-3 bg-red-600/20 text-red-400 border border-red-600/40 rounded-lg hover:bg-red-600/30 transition-colors"
          >
            Выйти из демо-режима
          </button>
        </div>
      </div>
    </div>
  );
}