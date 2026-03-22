'use client';

import React, { useState, useEffect } from 'react';
import { Weather } from '@/types';
import { TransferSearchWidget } from '@/components/transfer-operator/TransferSearchWidget';
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
      // silently fail
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
      <div className="p-5 lg:p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-[var(--text-muted)]">Загружаем данные...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Панель трансферов</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Управление маршрутами и транспортом</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-[var(--text-muted)]">Активных маршрутов</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{mockRoutes.length}</div>
            </div>
            {weather && (
              <div className="text-right">
                <div className="text-lg font-bold text-[var(--text-primary)]">{weather.temperature}°C</div>
                <p className="text-xs text-[var(--text-muted)]">{weather.location}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-md transition-colors text-sm font-medium ${
                selectedTab === tab.id
                  ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              {React.createElement(tab.Icon, { className: 'w-4 h-4' })}
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Tab */}
      {selectedTab === 'search' && (
        <div className="space-y-5">
          <TransferSearchWidget
            onSearchResults={setTransferResults}
            className="w-full"
          />
        </div>
      )}

      {/* Routes Tab */}
      {selectedTab === 'routes' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Управление маршрутами</h3>
            <button className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity">
              + Создать маршрут
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockRoutes.map((route) => (
              <div key={route.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">{route.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    route.status === 'active'
                      ? 'text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10'
                      : 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10'
                  }`}>
                    {route.status === 'active' ? 'Активен' : 'Неактивен'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Расстояние:</span>
                    <span className="text-[var(--text-primary)]">{route.distance}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Время в пути:</span>
                    <span className="text-[var(--text-primary)]">{route.duration}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Цена:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{route.price.toLocaleString()}₽</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Зависит от погоды:</span>
                    <span style={{ color: route.weatherDependent ? 'var(--warning)' : 'var(--success)' }}>
                      {route.weatherDependent ? 'Да' : 'Нет'}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Остановки:</p>
                  <div className="space-y-1">
                    {route.stops.map((stop) => (
                      <div key={stop} className="text-sm text-[var(--text-secondary)]">• {stop}</div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm border border-[var(--border)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-primary)] transition-colors">
                    Редактировать
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity">
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
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Управление транспортом</h3>
            <button className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity">
              + Добавить транспорт
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockVehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">{vehicle.model}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    vehicle.status === 'active'
                      ? 'text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10'
                      : 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10'
                  }`}>
                    {vehicle.status === 'active' ? 'Активен' : 'На обслуживании'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Тип:</span>
                    <span className="text-[var(--text-primary)]">{vehicle.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Вместимость:</span>
                    <span className="text-[var(--text-primary)]">{vehicle.capacity} мест</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Номер:</span>
                    <span className="text-[var(--text-primary)]">{vehicle.licensePlate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Водитель:</span>
                    <span className="text-[var(--text-primary)]">{vehicle.driver}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Следующее ТО:</span>
                    <span className="text-[var(--text-primary)]">{vehicle.nextService}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm border border-[var(--border)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-primary)] transition-colors">
                    Подробнее
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity">
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
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Управление водителями</h3>
            <button className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity">
              + Добавить водителя
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockDrivers.map((driver) => (
              <div key={driver.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">{driver.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    driver.status === 'active'
                      ? 'text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10'
                      : 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10'
                  }`}>
                    {driver.status === 'active' ? 'Активен' : 'В отпуске'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Опыт:</span>
                    <span className="text-[var(--text-primary)]">{driver.experience}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Рейтинг:</span>
                    <span className="flex items-center gap-1 text-[var(--text-primary)]">
                      {driver.rating} <Star className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Телефон:</span>
                    <span className="text-[var(--text-primary)]">{driver.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Удостоверение:</span>
                    <span className="text-[var(--text-primary)]">{driver.license}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Маршруты:</p>
                  <div className="space-y-1">
                    {driver.routes.map((route) => (
                      <div key={route} className="text-sm text-[var(--text-secondary)]">• {route}</div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm border border-[var(--border)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-primary)] transition-colors">
                    Профиль
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity">
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
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Управление бронированиями</h3>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Маршрут</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Дата/Время</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Пассажиры</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Транспорт</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Водитель</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Сумма</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {mockBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3 px-4 text-sm text-[var(--text-primary)]">{booking.route}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-muted)]">{booking.date} {booking.time}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-muted)]">{booking.passengers}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-muted)]">{booking.vehicle}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-muted)]">{booking.driver}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-[var(--text-primary)]">{booking.total.toLocaleString()}₽</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          booking.status === 'confirmed'
                            ? 'text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10'
                            : 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10'
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
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Аналитика и отчеты</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Всего маршрутов</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{mockRoutes.length}</p>
                </div>
                <Map className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Активных бронирований</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{mockBookings.length}</p>
                </div>
                <Ticket className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Доход за месяц</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">54000₽</p>
                </div>
                <span className="text-lg font-bold text-[var(--accent)]">₽</span>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Загрузка транспорта</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">85%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Популярные маршруты</h4>
              <div className="space-y-3">
                {mockRoutes.map((route) => (
                  <div key={route.id} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">{route.name}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-[var(--bg-primary)] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.random() * 100}%`, background: 'var(--accent)' }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-[var(--text-primary)] w-12 text-right">
                        {Math.floor(Math.random() * 50 + 10)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Доходы по маршрутам</h4>
              <div className="space-y-3">
                {mockRoutes.map((route) => (
                  <div key={route.id} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">{route.name}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-[var(--bg-primary)] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.random() * 100}%`, background: 'var(--accent)' }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-[var(--text-primary)] w-20 text-right">
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
  );
}
