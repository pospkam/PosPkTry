'use client';

import React, { useState, useEffect } from 'react';
import { Weather } from '@/types';

export default function GuideDashboard() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('schedule');

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      const response = await fetch('/api/weather?lat=53.0375&lng=158.6556&location=Петропавловск-Камчатский');
      const data = await response.json();
      if (data.success) {
        setWeather(data.data);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'schedule', name: 'Расписание', icon: '📅' },
    { id: 'groups', name: 'Группы', icon: '👥' },
    { id: 'earnings', name: 'Доходы', icon: '💰' },
    { id: 'weather', name: 'Погода', icon: '🌤️' },
    { id: 'profile', name: 'Профиль', icon: '👤' },
  ];

  const mockSchedule = [
    {
      id: '1',
      date: '2024-01-15',
      time: '07:00',
      tour: 'Восхождение на Авачинский вулкан',
      group: 'Группа 1',
      participants: 8,
      status: 'confirmed',
      meetingPoint: 'Площадь Ленина',
    },
    {
      id: '2',
      date: '2024-01-16',
      time: '09:00',
      tour: 'Долина гейзеров',
      group: 'Группа 2',
      participants: 12,
      status: 'confirmed',
      meetingPoint: 'Аэропорт Елизово',
    },
    {
      id: '3',
      date: '2024-01-17',
      time: '06:00',
      tour: 'Медвежье сафари',
      group: 'Группа 3',
      participants: 6,
      status: 'pending',
      meetingPoint: 'Причал в бухте Русская',
    },
  ];

  const mockGroups = [
    {
      id: '1',
      tour: 'Восхождение на Авачинский вулкан',
      date: '2024-01-15',
      participants: [
        { name: 'Иван Петров', phone: '+7 (999) 123-45-67', experience: 'Новичок' },
        { name: 'Мария Сидорова', phone: '+7 (999) 234-56-78', experience: 'Опытный' },
        { name: 'Алексей Козлов', phone: '+7 (999) 345-67-89', experience: 'Новичок' },
        { name: 'Елена Васнецова', phone: '+7 (999) 456-78-90', experience: 'Опытный' },
      ],
      specialRequirements: ['Аллергия на пыльцу', 'Вегетарианское питание'],
      emergencyContact: '+7 (4152) 123-456',
    },
  ];

  const mockEarnings = {
    thisMonth: 125000,
    lastMonth: 98000,
    thisYear: 1450000,
    totalTours: 45,
    averagePerTour: 2778,
    nextPayout: '2024-01-20',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/40 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загружаем данные...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <div className="bg-gradient-to-r from-premium-black to-premium-gold/10 border-b border-white/40/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Панель гида</h1>
              <p className="text-white/70 mt-1">Управление расписанием и группами</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-white text-sm">Рейтинг гида</div>
                <div className="text-white text-lg font-bold">4.9 ⭐</div>
              </div>
              {weather && (
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🌤️</span>
                    <span className="text-white text-lg font-bold">{weather.temperature}°C</span>
                  </div>
                  <p className="text-white/70 text-sm">{weather.location}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-white/25 rounded-xl p-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors ${
                selectedTab === tab.id
                  ? 'bg-premium-gold text-premium-black'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Schedule Tab */}
        {selectedTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Расписание туров</h3>
              <button className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold">
                + Добавить доступность
              </button>
            </div>

            <div className="space-y-4">
              {mockSchedule.map((item) => (
                <div key={item.id} className="bg-white/25 rounded-2xl p-6 border border-white/40">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white">{item.tour}</h4>
                      <p className="text-white/70">{item.group} • {item.participants} участников</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === 'confirmed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.status === 'confirmed' ? 'Подтверждено' : 'Ожидает'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-white/70 text-sm">Дата и время</p>
                      <p className="text-white font-bold">{item.date} в {item.time}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Место встречи</p>
                      <p className="text-white">{item.meetingPoint}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Участников</p>
                      <p className="text-white">{item.participants} человек</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                      Подробности
                    </button>
                    <button className="px-4 py-2 bg-premium-gold text-premium-black rounded-lg hover:bg-premium-gold/90 transition-colors text-sm font-bold">
                      Группа
                    </button>
                    <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm">
                      Отменить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {selectedTab === 'groups' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Управление группами</h3>
            
            {mockGroups.map((group) => (
              <div key={group.id} className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h4 className="text-xl font-bold text-white">{group.tour}</h4>
                    <p className="text-white/70">{group.date} • {group.participants.length} участников</p>
                  </div>
                  <button className="px-4 py-2 bg-premium-gold text-premium-black rounded-lg hover:bg-premium-gold/90 transition-colors text-sm font-bold">
                    Связаться с группой
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h5 className="text-lg font-bold text-white mb-3">Участники группы</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.participants.map((participant, index) => (
                        <div key={index} className="bg-white/25 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-white font-bold">{participant.name}</h6>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              participant.experience === 'Опытный' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {participant.experience}
                            </span>
                          </div>
                          <p className="text-white/70 text-sm">{participant.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {group.specialRequirements.length > 0 && (
                    <div>
                      <h5 className="text-lg font-bold text-white mb-3">Особые требования</h5>
                      <div className="space-y-2">
                        {group.specialRequirements.map((req, index) => (
                          <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                            <p className="text-yellow-400 text-sm">⚠️ {req}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h5 className="text-lg font-bold text-white mb-3">Экстренные контакты</h5>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">🚨 {group.emergencyContact}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Earnings Tab */}
        {selectedTab === 'earnings' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Доходы и выплаты</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Этот месяц</p>
                    <p className="text-3xl font-bold text-white">{mockEarnings.thisMonth.toLocaleString()}₽</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              </div>
              
              <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Прошлый месяц</p>
                    <p className="text-3xl font-bold text-white">{mockEarnings.lastMonth.toLocaleString()}₽</p>
                  </div>
                  <div className="text-3xl">📊</div>
                </div>
              </div>
              
              <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Этот год</p>
                    <p className="text-3xl font-bold text-white">{mockEarnings.thisYear.toLocaleString()}₽</p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
              </div>
              
              <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Средний чек</p>
                    <p className="text-3xl font-bold text-white">{mockEarnings.averagePerTour.toLocaleString()}₽</p>
                  </div>
                  <div className="text-3xl">⚡</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <h4 className="text-lg font-bold text-white mb-4">Статистика туров</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Всего туров</span>
                    <span className="text-white font-bold">{mockEarnings.totalTours}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Следующая выплата</span>
                    <span className="text-white font-bold">{mockEarnings.nextPayout}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <h4 className="text-lg font-bold text-white mb-4">Доходы по месяцам</h4>
                <div className="space-y-3">
                  {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'].map((month, index) => (
                    <div key={month} className="flex items-center justify-between">
                      <span className="text-white/70">{month}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-premium-gold h-2 rounded-full" 
                            style={{ width: `${Math.random() * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-bold w-20 text-right">
                          {Math.floor(Math.random() * 50000 + 20000).toLocaleString()}₽
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weather Tab */}
        {selectedTab === 'weather' && weather && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Погодные условия</h3>
            
            <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-4xl mb-2">🌤️</div>
                  <div className="text-3xl font-bold text-white">{weather.temperature}°C</div>
                  <div className="text-white/70 capitalize">{weather.condition}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">💨</div>
                  <div className="text-xl font-bold text-white">{weather.windSpeed} км/ч</div>
                  <div className="text-white/70">Ветер</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">💧</div>
                  <div className="text-xl font-bold text-white">{weather.humidity}%</div>
                  <div className="text-white/70">Влажность</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">👁️</div>
                  <div className="text-xl font-bold text-white">{weather.visibility} км</div>
                  <div className="text-white/70">Видимость</div>
                </div>
              </div>
              
              <div className="border-t border-white/40 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white">Рекомендации для гидов</h4>
                  <span className={`text-lg font-bold ${
                    weather.safetyLevel === 'excellent' ? 'text-green-400' :
                    weather.safetyLevel === 'good' ? 'text-blue-400' :
                    weather.safetyLevel === 'difficult' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {weather.safetyLevel === 'excellent' && 'Отличные условия'}
                    {weather.safetyLevel === 'good' && 'Хорошие условия'}
                    {weather.safetyLevel === 'difficult' && 'Сложные условия'}
                    {weather.safetyLevel === 'dangerous' && 'Опасные условия'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {weather.recommendations?.map((rec, index) => (
                    <div key={index} className="text-white/70 text-sm">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {selectedTab === 'profile' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Профиль гида</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <h4 className="text-lg font-bold text-white mb-4">Личная информация</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Имя</label>
                    <input
                      type="text"
                      defaultValue="Александр Вулканов"
                      className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Телефон</label>
                    <input
                      type="tel"
                      defaultValue="+7 (999) 123-45-67"
                      className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue="alex@guide.kamchatka.ru"
                      className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-white/25 rounded-2xl p-6 border border-white/40">
                <h4 className="text-lg font-bold text-white mb-4">Профессиональная информация</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Специализация</label>
                    <select className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Горные походы</option>
                      <option>Экскурсии</option>
                      <option>Дикая природа</option>
                      <option>Рыбалка</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Опыт работы</label>
                    <input
                      type="text"
                      defaultValue="5 лет"
                      className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Языки</label>
                    <input
                      type="text"
                      defaultValue="Русский, Английский"
                      className="w-full px-4 py-3 bg-white/25 border border-white/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button className="px-8 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold">
                Сохранить изменения
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}