'use client';

import React, { useState, useEffect } from 'react';
import { Weather } from '@/types';
import { TransferSearchWidget } from '@/components/TransferSearchWidget';
import { PublicNav } from '@/components/shared/PublicNav';
import { Star, Search, Map, Bus, User, Calendar, Ticket, BarChart3 } from 'lucide-react';

export default function TransferDashboardClient() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('search');
  const [transferResults, setTransferResults] = useState<any[]>([]);

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
    { id: 'search', name: 'Поиск', Icon: Search },
    { id: 'routes', name: 'Маршруты', Icon: Map },
    { id: 'vehicles', name: 'Транспорт', Icon: Bus },
    { id: 'drivers', name: 'Водители', Icon: User },
    { id: 'schedule', name: 'Расписание', Icon: Calendar },
    { id: 'bookings', name: 'Бронирования', Icon: Ticket },
    { id: 'analytics', name: 'Аналитика', Icon: BarChart3 },
  ];

  const mockRoutes = [
    {
      id: '1',
      name: 'Петропавловск - Долина гейзеров',
      distance: '180 км',
      duration: '3 часа',
      stops: ['Елизово', 'Мильково', 'Долина гейзеров'],
      price: 2500,
      status: 'active',
      weatherDependent: true,
    },
    {
      id: '2',
      name: 'Петропавловск - Авачинский вулкан',
      distance: '45 км',
      duration: '1.5 часа',
      stops: ['База отдыха', 'Подножие вулкана'],
      price: 1500,
      status: 'active',
      weatherDependent: true,
    },
    {
      id: '3',
      name: 'Петропавловск - Медвежье сафари',
      distance: '120 км',
      duration: '2.5 часа',
      stops: ['Причал', 'Бухта Русская'],
      price: 2000,
      status: 'active',
      weatherDependent: false,
    },
  ];

  const mockVehicles = [
    {
      id: '1',
      type: 'Автобус',
      model: 'ПАЗ-4234',
      capacity: 25,
      licensePlate: 'А123БВ 41',
      driver: 'Иван Петров',
      status: 'active',
      lastService: '2024-01-10',
      nextService: '2024-02-10',
    },
    {
      id: '2',
      type: 'Микроавтобус',
      model: 'ГАЗель Next',
      capacity: 12,
      licensePlate: 'В456ГД 41',
      driver: 'Мария Сидорова',
      status: 'maintenance',
      lastService: '2024-01-15',
      nextService: '2024-01-20',
    },
    {
      id: '3',
      type: 'Вертолет',
      model: 'Ми-8',
      capacity: 8,
      licensePlate: 'RA-12345',
      driver: 'Алексей Козлов',
      status: 'active',
      lastService: '2024-01-12',
      nextService: '2024-02-12',
    },
  ];

  const mockDrivers = [
    {
      id: '1',
      name: 'Иван Петров',
      license: 'A1234567890',
      experience: '8 лет',
      rating: 4.9,
      routes: ['Петропавловск - Долина гейзеров', 'Петропавловск - Авачинский вулкан'],
      status: 'active',
      phone: '+7 (999) 123-45-67',
    },
    {
      id: '2',
      name: 'Мария Сидорова',
      license: 'B2345678901',
      experience: '5 лет',
      rating: 4.8,
      routes: ['Петропавловск - Медвежье сафари'],
      status: 'on_leave',
      phone: '+7 (999) 234-56-78',
    },
    {
      id: '3',
      name: 'Алексей Козлов',
      license: 'C3456789012',
      experience: '12 лет',
      rating: 4.9,
      routes: ['Петропавловск - Долина гейзеров', 'Петропавловск - Медвежье сафари'],
      status: 'active',
      phone: '+7 (999) 345-67-89',
    },
  ];

  const mockBookings = [
    {
      id: '1',
      route: 'Петропавловск - Долина гейзеров',
      date: '2024-01-15',
      time: '09:00',
      passengers: 12,
      vehicle: 'ПАЗ-4234',
      driver: 'Иван Петров',
      total: 30000,
      status: 'confirmed',
    },
    {
      id: '2',
      route: 'Петропавловск - Авачинский вулкан',
      date: '2024-01-16',
      time: '07:00',
      passengers: 8,
      vehicle: 'ГАЗель Next',
      driver: 'Мария Сидорова',
      total: 12000,
      status: 'pending',
    },
    {
      id: '3',
      route: 'Петропавловск - Медвежье сафари',
      date: '2024-01-17',
      time: '06:00',
      passengers: 6,
      vehicle: 'Ми-8',
      driver: 'Алексей Козлов',
      total: 12000,
      status: 'confirmed',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/15 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загружаем данные...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <PublicNav />
      {/* Header */}
      <div className="bg-gradient-to-r from-premium-black to-premium-gold/10 border-b border-white/15/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Панель трансферов</h1>
              <p className="text-white/70 mt-1">Управление маршрутами и транспортом</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-white text-sm">Активных маршрутов</div>
                <div className="text-white text-lg font-bold">{mockRoutes.length}</div>
              </div>
              {weather && (
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl"></span>
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
        <div className="flex space-x-1 bg-white/15 rounded-xl p-1 mb-8">
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
              {React.createElement(tab.Icon, { className: 'w-5 h-5' })}
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Search Tab */}
        {selectedTab === 'search' && (
          <div className="space-y-6">
            <TransferSearchWidget 
              onSearchResults={setTransferResults}
              className="w-full"
            />
          </div>
        )}

        {/* Routes Tab */}
        {selectedTab === 'routes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Управление маршрутами</h3>
              <button className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold">
                + Создать маршрут
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockRoutes.map((route) => (
                <div key={route.id} className="bg-white/15 rounded-2xl p-6 border border-white/15">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-bold text-white">{route.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      route.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {route.status === 'active' ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Расстояние:</span>
                      <span className="text-white">{route.distance}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Время в пути:</span>
                      <span className="text-white">{route.duration}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Цена:</span>
                      <span className="text-white font-bold">{route.price.toLocaleString()}₽</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Зависит от погоды:</span>
                      <span className={route.weatherDependent ? 'text-yellow-400' : 'text-green-400'}>
                        {route.weatherDependent ? 'Да' : 'Нет'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-white/70 text-sm mb-2">Остановки:</p>
                    <div className="space-y-1">
                      {route.stops.map((stop) => (
                        <div key={stop} className="text-white text-sm">• {stop}</div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                      Редактировать
                    </button>
                    <button className="flex-1 px-4 py-2 bg-premium-gold text-premium-black rounded-lg hover:bg-premium-gold/90 transition-colors text-sm font-bold">
                      Расписание
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicles Tab */}
        {selectedTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Управление транспортом</h3>
              <button className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold">
                + Добавить транспорт
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockVehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white/15 rounded-2xl p-6 border border-white/15">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-bold text-white">{vehicle.model}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      vehicle.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {vehicle.status === 'active' ? 'Активен' : 'На обслуживании'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Тип:</span>
                      <span className="text-white">{vehicle.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Вместимость:</span>
                      <span className="text-white">{vehicle.capacity} мест</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Номер:</span>
                      <span className="text-white">{vehicle.licensePlate}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Водитель:</span>
                      <span className="text-white">{vehicle.driver}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Следующее ТО:</span>
                      <span className="text-white">{vehicle.nextService}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                      Подробнее
                    </button>
                    <button className="flex-1 px-4 py-2 bg-premium-gold text-premium-black rounded-lg hover:bg-premium-gold/90 transition-colors text-sm font-bold">
                      ТО
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drivers Tab */}
        {selectedTab === 'drivers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Управление водителями</h3>
              <button className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold">
                + Добавить водителя
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockDrivers.map((driver) => (
                <div key={driver.id} className="bg-white/15 rounded-2xl p-6 border border-white/15">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-bold text-white">{driver.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      driver.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {driver.status === 'active' ? 'Активен' : 'В отпуске'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Опыт:</span>
                      <span className="text-white">{driver.experience}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Рейтинг:</span>
                      <span className="text-white">{driver.rating} <Star className="w-4 h-4" /></span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Телефон:</span>
                      <span className="text-white">{driver.phone}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Удостоверение:</span>
                      <span className="text-white">{driver.license}</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-white/70 text-sm mb-2">Маршруты:</p>
                    <div className="space-y-1">
                      {driver.routes.map((route) => (
                        <div key={route} className="text-white text-sm">• {route}</div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                      Профиль
                    </button>
                    <button className="flex-1 px-4 py-2 bg-premium-gold text-premium-black rounded-lg hover:bg-premium-gold/90 transition-colors text-sm font-bold">
                      Расписание
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {selectedTab === 'bookings' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Управление бронированиями</h3>
            
            <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/15">
                      <th className="text-left py-3 px-4 text-white/70">Маршрут</th>
                      <th className="text-left py-3 px-4 text-white/70">Дата/Время</th>
                      <th className="text-left py-3 px-4 text-white/70">Пассажиры</th>
                      <th className="text-left py-3 px-4 text-white/70">Транспорт</th>
                      <th className="text-left py-3 px-4 text-white/70">Водитель</th>
                      <th className="text-left py-3 px-4 text-white/70">Сумма</th>
                      <th className="text-left py-3 px-4 text-white/70">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-white/5">
                        <td className="py-3 px-4 text-white">{booking.route}</td>
                        <td className="py-3 px-4 text-white/70">{booking.date} {booking.time}</td>
                        <td className="py-3 px-4 text-white/70">{booking.passengers}</td>
                        <td className="py-3 px-4 text-white/70">{booking.vehicle}</td>
                        <td className="py-3 px-4 text-white/70">{booking.driver}</td>
                        <td className="py-3 px-4 text-white font-bold">{booking.total.toLocaleString()}₽</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {booking.status === 'confirmed' ? 'Подтверждено' : 'Ожидает'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {selectedTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Аналитика и отчеты</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Всего маршрутов</p>
                    <p className="text-3xl font-bold text-white">{mockRoutes.length}</p>
                  </div>
                  <div className="text-3xl"><Map className="w-8 h-8" /></div>
                </div>
              </div>
              
              <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Активных бронирований</p>
                    <p className="text-3xl font-bold text-white">{mockBookings.length}</p>
                  </div>
                  <div className="text-3xl"><Ticket className="w-8 h-8" /></div>
                </div>
              </div>
              
              <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Доход за месяц</p>
                    <p className="text-3xl font-bold text-white">54000₽</p>
                  </div>
                  <div className="text-3xl"><span className="text-premium-gold font-bold">₽</span></div>
                </div>
              </div>
              
              <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Загрузка транспорта</p>
                    <p className="text-3xl font-bold text-white">85%</p>
                  </div>
                  <div className="text-3xl"><BarChart3 className="w-8 h-8" /></div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <h4 className="text-lg font-bold text-white mb-4">Популярные маршруты</h4>
                <div className="space-y-3">
                  {mockRoutes.map((route, routeIdx) => (
                    <div key={route.id} className="flex items-center justify-between">
                      <span className="text-white/70">{route.name}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-premium-gold h-2 rounded-full" 
                            style={{ width: `${Math.random() * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-bold w-12 text-right">
                          {Math.floor(Math.random() * 50 + 10)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <h4 className="text-lg font-bold text-white mb-4">Доходы по маршрутам</h4>
                <div className="space-y-3">
                  {mockRoutes.map((route, routeIncomeIdx) => (
                    <div key={route.id} className="flex items-center justify-between">
                      <span className="text-white/70">{route.name}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-premium-gold h-2 rounded-full" 
                            style={{ width: `${Math.random() * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-bold w-20 text-right">
                          {Math.floor(Math.random() * 20000 + 5000).toLocaleString()}₽
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}