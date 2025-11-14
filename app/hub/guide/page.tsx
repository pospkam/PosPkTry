'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Weather } from '@/types';
import { Protected } from '@/components/Protected';

type GuideScheduleEntry = {
  id: string;
  tourName?: string;
  title?: string;
  startTime: string;
  endTime?: string;
  status: string;
  maxParticipants?: number;
  currentParticipants?: number;
  locationName?: string;
};

type GuideGroup = {
  id: string;
  tourName?: string;
  tourDate?: string;
  groupName?: string;
  participants: Array<{ name?: string; phone?: string; experience?: string }>;
  emergencyContacts?: Array<{ name?: string; phone?: string }>;
  specialNeeds?: string;
  equipmentChecklist?: string[];
  status: string;
};

type GuideEarningsStats = {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalCommission: number;
  totalCount: number;
  avgCommissionRate: number;
};

export default function GuideDashboard() {
  const [selectedTab, setSelectedTab] = useState('schedule');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [schedule, setSchedule] = useState<GuideScheduleEntry[]>([]);
  const [groups, setGroups] = useState<GuideGroup[]>([]);
  const [earnings, setEarnings] = useState<GuideEarningsStats | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [weatherRes, scheduleRes, groupsRes, earningsRes, statsRes] = await Promise.all([
        fetch('/api/weather?lat=53.0375&lng=158.6556&location=Петропавловск-Камчатский'),
        fetch('/api/guide/schedule'),
        fetch('/api/guide/groups'),
        fetch('/api/guide/earnings'),
        fetch('/api/guide/stats'),
      ]);

      if (weatherRes.ok) {
        const weatherJson = await weatherRes.json();
        if (weatherJson.success) setWeather(weatherJson.data);
      }

      if (!scheduleRes.ok) throw new Error('Не удалось загрузить расписание');
      const scheduleJson = await scheduleRes.json();
      setSchedule(scheduleJson.data?.schedule || []);

      if (!groupsRes.ok) throw new Error('Не удалось загрузить группы');
      const groupsJson = await groupsRes.json();
      setGroups(groupsJson.data?.groups || []);

      if (!earningsRes.ok) throw new Error('Не удалось загрузить доходы');
      const earningsJson = await earningsRes.json();
      setEarnings(earningsJson.data?.stats || null);

      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.success) setStats(statsJson.data);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const tabs = useMemo(
    () => [
      { id: 'schedule', name: 'Расписание', icon: ' ' },
      { id: 'groups', name: 'Группы', icon: ' ' },
      { id: 'earnings', name: 'Доходы', icon: ' ' },
      { id: 'weather', name: 'Погода', icon: '🌤️' },
      { id: 'profile', name: 'Профиль', icon: '👤' },
    ],
    []
  );

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    try {
      const date = parseISO(value);
      return format(date, "d MMMM yyyy 'в' HH:mm", { locale: ru });
    } catch {
      return value;
    }
  };

  const formatCurrency = (value = 0) =>
    value.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 });

  if (loading) {
    return (
      <Protected roles={['guide', 'admin']}>
        <div className="min-h-screen bg-premium-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-premium-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Загружаем данные...</p>
          </div>
        </div>
      </Protected>
    );
  }

  return (
    <Protected roles={['guide', 'admin']}>
      <div className="min-h-screen bg-premium-black">
        {/* Header */}
        <div className="bg-gradient-to-r from-premium-black to-premium-gold/10 border-b border-premium-gold/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Панель гида</h1>
                <p className="text-white/70 mt-1">Управление расписанием и группами</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-white text-sm">Рейтинг гида</div>
                  <div className="text-premium-gold text-lg font-bold">
                    {stats?.reviews?.avgRating ?? '—'} ★
                  </div>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex space-x-1 bg-white/5 rounded-xl p-1 mb-6">
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

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              {error}
            </div>
          )}

          {/* Schedule */}
          {selectedTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Расписание туров</h3>
                <button
                  onClick={loadData}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-bold"
                >
                  Обновить
                </button>
              </div>
              {schedule.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
                  Нет запланированных мероприятий. Добавьте доступность через API или мобильное приложение.
                </div>
              )}
              {schedule.map((item) => (
                <div key={item.id} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white">{item.tourName || item.title}</h4>
                      <p className="text-white/70">
                        {(item.currentParticipants ?? 0)}/{item.maxParticipants ?? '∞'} участников
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : item.status === 'in_progress'
                          ? 'bg-blue-500/20 text-blue-400'
                          : item.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-white/70 text-sm">Начало</p>
                      <p className="text-white font-bold">{formatDateTime(item.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Окончание</p>
                      <p className="text-white">{formatDateTime(item.endTime)}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Место встречи</p>
                      <p className="text-white">{item.locationName || 'не указано'}</p>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm">
                    ID мероприятия: <span className="font-mono">{item.id}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Groups */}
          {selectedTab === 'groups' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Управление группами</h3>
              {groups.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
                  Группы ещё не созданы. Добавьте запись в расписании и создайте группу через API.
                </div>
              )}
              {groups.map((group) => (
                <div key={group.id} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h4 className="text-xl font-bold text-white">{group.tourName || group.groupName}</h4>
                      <p className="text-white/70">
                        {group.tourDate ? formatDateTime(group.tourDate) : 'Дата не указана'} •{' '}
                        {group.participants?.length || 0} участников
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-premium-gold text-premium-black rounded-lg hover:bg-premium-gold/90 transition-colors text-sm font-bold">
                      Связаться
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-lg font-bold text-white mb-3">Участники</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(group.participants || []).map((participant, index) => (
                          <div key={index} className="bg-white/5 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-white font-bold">{participant.name || 'Участник'}</h6>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  participant.experience === 'Опытный'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {participant.experience || 'Новичок'}
                              </span>
                            </div>
                            <p className="text-white/70 text-sm">{participant.phone || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {group.specialNeeds && (
                      <div>
                        <h5 className="text-lg font-bold text-white mb-3">Особые требования</h5>
                        <div className="space-y-2">
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-200 text-sm">
                            {group.specialNeeds}
                          </div>
                          {(group.equipmentChecklist || []).map((item, index) => (
                            <div
                              key={`${group.id}-eq-${index}`}
                              className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2 text-yellow-100 text-sm"
                            >
                              • {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h5 className="text-lg font-bold text-white mb-3">Экстренные контакты</h5>
                      <div className="space-y-2">
                        {(group.emergencyContacts || []).map((contact, index) => (
                          <div key={`${group.id}-contact-${index}`} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <p className="text-red-300 text-sm">
                              {contact.name ? `${contact.name}: ` : ''}
                              {contact.phone || '—'}
                            </p>
                          </div>
                        ))}
                        {(!group.emergencyContacts || group.emergencyContacts.length === 0) && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-300 text-sm">
                            Нет сохранённых контактов
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Earnings */}
          {selectedTab === 'earnings' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Доходы и выплаты</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Всего заработано" value={formatCurrency(earnings?.totalEarned || 0)} />
                <StatCard label="Выплачено" value={formatCurrency(earnings?.totalPaid || 0)} />
                <StatCard label="Ожидает выплаты" value={formatCurrency(earnings?.totalPending || 0)} />
                <StatCard
                  label="Комиссия"
                  value={`${formatCurrency(earnings?.totalCommission || 0)} • ${
                    earnings?.avgCommissionRate?.toFixed(1) ?? '—'
                  }%`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Статистика туров</h4>
                  <div className="space-y-3">
                    <StatRow label="Завершено" value={stats?.tours?.completed ?? 0} />
                    <StatRow label="Запланировано" value={stats?.tours?.scheduled ?? 0} />
                    <StatRow label="Активно" value={stats?.tours?.active ?? 0} />
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Отзывы</h4>
                  <div className="space-y-3">
                    <StatRow label="Средний рейтинг" value={`${stats?.reviews?.avgRating ?? '—'} ★`} />
                    <StatRow label="Всего отзывов" value={stats?.reviews?.total ?? 0} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weather */}
          {selectedTab === 'weather' && weather && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Погодные условия</h3>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <WeatherMetric icon="🌤️" label="Температура" value={`${weather.temperature}°C`} />
                  <WeatherMetric icon="💨" label="Ветер" value={`${weather.windSpeed} км/ч`} />
                  <WeatherMetric icon="💧" label="Влажность" value={`${weather.humidity}%`} />
                  <WeatherMetric icon="○" label="Видимость" value={`${weather.visibility} км`} />
                </div>
                <div className="border-t border-white/10 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white">Рекомендации</h4>
                    <span
                      className={`text-lg font-bold ${
                        weather.safetyLevel === 'excellent'
                          ? 'text-green-400'
                          : weather.safetyLevel === 'good'
                          ? 'text-blue-400'
                          : weather.safetyLevel === 'difficult'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {weather.safetyLevel}
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

          {/* Profile */}
          {selectedTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Профиль гида</h3>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
                Настройки профиля управляются через страницу «Партнёрский профиль». Здесь появится форма,
                когда API профиля будет готов.
              </div>
            </div>
          )}
        </div>
      </div>
    </Protected>
  );
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/70 text-sm">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </div>
  </div>
);

const StatRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between">
    <span className="text-white/70">{label}</span>
    <span className="text-white font-bold">{value}</span>
  </div>
);

const WeatherMetric = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="text-center">
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-white/70">{label}</div>
  </div>
);
