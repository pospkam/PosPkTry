'use client';

import React, { useState, useEffect } from 'react';
import { Weather } from '@/types';
import { Star, Wind, AlertTriangle, AlertCircle, DollarSign, BarChart3, TrendingUp, Droplets, Eye, Calendar, Users, User, Cloud, Loader2 } from 'lucide-react';

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  tourTitle: string | null;
  currentParticipants: number;
  maxParticipants: number;
  status: string;
  locationName: string | null;
}

interface GroupItem {
  id: string;
  groupName: string;
  tourName: string;
  tourDate: string;
  participants: { name: string; phone?: string; experience?: string }[];
  emergencyContacts: string[];
  specialNeeds: string | null;
}

interface EarningsStats {
  totalCount: number;
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalCommission: number;
  avgCommissionRate: number;
}

interface EarningItem {
  id: string;
  amount: number;
  paymentStatus: string;
  tourName: string | null;
  tourDate: string | null;
  createdAt: string;
}

export default function GuideDashboardClient() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('schedule');

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsFetched, setGroupsFetched] = useState(false);

  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [earningsStats, setEarningsStats] = useState<EarningsStats | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsFetched, setEarningsFetched] = useState(false);

  useEffect(() => {
    fetchWeather();
    fetchSchedule();
  }, []);

  useEffect(() => {
    if (selectedTab === 'groups' && !groupsFetched && !groupsLoading) {
      fetchGroups();
    }
    if (selectedTab === 'earnings' && !earningsFetched && !earningsLoading) {
      fetchEarnings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

  const fetchWeather = async () => {
    try {
      const response = await fetch('/api/weather?lat=53.0375&lng=158.6556&location=Петропавловск-Камчатский');
      const data = await response.json();
      if (data.success) setWeather(data.data);
    } catch (error) {
      console.error('Ошибка загрузки погоды:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const res = await fetch('/api/guide/schedule');
      const data = await res.json();
      if (data.success) {
        setSchedule((data.data ?? []).map((item: Record<string, unknown>) => ({
          id: item.id,
          startTime: item.startTime,
          endTime: item.endTime,
          title: item.title,
          tourTitle: item.tourTitle ?? null,
          currentParticipants: (item.currentParticipants as number) ?? 0,
          maxParticipants: (item.maxParticipants as number) ?? 0,
          status: item.status,
          locationName: item.locationName ?? null,
        })));
      }
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
    } finally {
      setScheduleLoading(false);
    }
  };

  const fetchGroups = async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/guide/groups');
      const data = await res.json();
      if (data.success) setGroups(data.data ?? []);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    } finally {
      setGroupsLoading(false);
      setGroupsFetched(true);
    }
  };

  const fetchEarnings = async () => {
    setEarningsLoading(true);
    try {
      const res = await fetch('/api/guide/earnings');
      const data = await res.json();
      if (data.success) {
        setEarnings(data.data?.earnings ?? []);
        setEarningsStats(data.data?.stats ?? null);
      }
    } catch (error) {
      console.error('Ошибка загрузки доходов:', error);
    } finally {
      setEarningsLoading(false);
      setEarningsFetched(true);
    }
  };

  const tabs = [
    { id: 'schedule', name: 'Расписание', Icon: Calendar },
    { id: 'groups', name: 'Группы', Icon: Users },
    { id: 'earnings', name: 'Доходы', Icon: DollarSign },
    { id: 'weather', name: 'Погода', Icon: Cloud },
    { id: 'profile', name: 'Профиль', Icon: User },
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
      {/* Header */}
      <div className="bg-gradient-to-r from-premium-black to-premium-gold/10 border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Панель гида</h1>
              <p className="text-white/70 mt-1">Управление расписанием и группами</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-white text-sm">Рейтинг гида</div>
                <div className="text-white text-lg font-bold flex items-center gap-1">4.9 <Star className="w-4 h-4" /></div>
              </div>
              {weather && (
                <div className="text-right">
                  <div className="text-white text-lg font-bold">{weather.temperature}°C</div>
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

        {/* Schedule Tab */}
        {selectedTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Расписание туров</h3>
              <button className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl hover:bg-premium-gold/90 transition-colors font-bold">
                + Добавить доступность
              </button>
            </div>

            {scheduleLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
              </div>
            ) : schedule.length === 0 ? (
              <div className="bg-white/15 rounded-2xl p-8 text-center border border-white/15">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-white/30" />
                <p className="text-white/50">Расписание пусто. Добавьте доступность для приёма заявок.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedule.map((item) => {
                  const start = new Date(item.startTime);
                  const dateStr = start.toLocaleDateString('ru-RU');
                  const timeStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={item.id} className="bg-white/15 rounded-2xl p-6 border border-white/15">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white">{item.tourTitle ?? item.title}</h4>
                          <p className="text-white/70">{item.currentParticipants}/{item.maxParticipants} участников</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          ['confirmed', 'available'].includes(item.status)
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {['confirmed', 'available'].includes(item.status) ? 'Подтверждено' : 'Ожидает'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-white/70 text-sm">Дата и время</p>
                          <p className="text-white font-bold">{dateStr} в {timeStr}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-sm">Место встречи</p>
                          <p className="text-white">{item.locationName ?? 'Уточняется'}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-sm">Вместимость</p>
                          <p className="text-white">{item.currentParticipants} / {item.maxParticipants}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                          Подробности
                        </button>
                        <button className="px-4 py-2 bg-premium-gold text-premium-black rounded-lg hover:bg-premium-gold/90 transition-colors text-sm font-bold">
                          Группа
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Groups Tab */}
        {selectedTab === 'groups' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Управление группами</h3>

            {groupsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
              </div>
            ) : groups.length === 0 ? (
              <div className="bg-white/15 rounded-2xl p-8 text-center border border-white/15">
                <Users className="w-12 h-12 mx-auto mb-3 text-white/30" />
                <p className="text-white/50">Групп пока нет.</p>
              </div>
            ) : groups.map((group) => (
              <div key={group.id} className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h4 className="text-xl font-bold text-white">{group.tourName}</h4>
                    <p className="text-white/70">
                      {group.tourDate ? new Date(group.tourDate).toLocaleDateString('ru-RU') : ''} • {group.participants.length} участников
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-premium-gold text-premium-black rounded-lg hover:bg-premium-gold/90 transition-colors text-sm font-bold">
                    Связаться с группой
                  </button>
                </div>

                {group.participants.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-lg font-bold text-white mb-3">Участники группы</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.participants.map((participant, idx) => (
                        <div key={idx} className="bg-white/15 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-white font-bold">{participant.name}</h6>
                            {participant.experience && (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                participant.experience === 'Опытный'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-white/20 text-white/70'
                              }`}>
                                {participant.experience}
                              </span>
                            )}
                          </div>
                          {participant.phone && <p className="text-white/70 text-sm">{participant.phone}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {group.specialNeeds && (
                  <div className="mb-4">
                    <h5 className="text-lg font-bold text-white mb-3">Особые требования</h5>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-yellow-400 text-sm flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> {group.specialNeeds}
                      </p>
                    </div>
                  </div>
                )}

                {group.emergencyContacts.length > 0 && (
                  <div>
                    <h5 className="text-lg font-bold text-white mb-3">Экстренные контакты</h5>
                    {group.emergencyContacts.map((contact, idx) => (
                      <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-2">
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> {contact}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Earnings Tab */}
        {selectedTab === 'earnings' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Доходы и выплаты</h3>

            {earningsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
              </div>
            ) : earningsStats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Всего заработано</p>
                        <p className="text-3xl font-bold text-white">{earningsStats.totalEarned.toLocaleString('ru-RU')}₽</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-white/30" />
                    </div>
                  </div>

                  <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Выплачено</p>
                        <p className="text-3xl font-bold text-white">{earningsStats.totalPaid.toLocaleString('ru-RU')}₽</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-white/30" />
                    </div>
                  </div>

                  <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Ожидает выплаты</p>
                        <p className="text-3xl font-bold text-white">{earningsStats.totalPending.toLocaleString('ru-RU')}₽</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-white/30" />
                    </div>
                  </div>

                  <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Всего туров</p>
                        <p className="text-3xl font-bold text-white">{earningsStats.totalCount}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-white/30" />
                    </div>
                  </div>
                </div>

                {earnings.length > 0 && (
                  <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                    <h4 className="text-lg font-bold text-white mb-4">Последние поступления</h4>
                    <div className="space-y-3">
                      {earnings.slice(0, 8).map((e) => (
                        <div key={e.id} className="flex items-center justify-between">
                          <div>
                            <span className="text-white">{e.tourName ?? 'Тур'}</span>
                            <span className="text-white/50 text-xs ml-2">
                              {e.tourDate
                                ? new Date(e.tourDate).toLocaleDateString('ru-RU')
                                : new Date(e.createdAt).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              e.paymentStatus === 'paid'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {e.paymentStatus === 'paid' ? 'Выплачено' : 'Ожидает'}
                            </span>
                            <span className="text-white font-bold">{e.amount.toLocaleString('ru-RU')}₽</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/15 rounded-2xl p-8 text-center border border-white/15">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-white/30" />
                <p className="text-white/50">Данные о доходах не найдены.</p>
              </div>
            )}
          </div>
        )}

        {/* Weather Tab */}
        {selectedTab === 'weather' && weather && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Погодные условия</h3>

            <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{weather.temperature}°C</div>
                  <div className="text-white/70 capitalize">{weather.condition}</div>
                </div>

                <div className="text-center">
                  <Wind className="w-6 h-6 mx-auto mb-2 text-white/50" />
                  <div className="text-xl font-bold text-white">{weather.windSpeed} км/ч</div>
                  <div className="text-white/70">Ветер</div>
                </div>

                <div className="text-center">
                  <Droplets className="w-6 h-6 mx-auto mb-2 text-white/50" />
                  <div className="text-xl font-bold text-white">{weather.humidity}%</div>
                  <div className="text-white/70">Влажность</div>
                </div>

                <div className="text-center">
                  <Eye className="w-6 h-6 mx-auto mb-2 text-white/50" />
                  <div className="text-xl font-bold text-white">{weather.visibility} км</div>
                  <div className="text-white/70">Видимость</div>
                </div>
              </div>

              <div className="border-t border-white/15 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white">Рекомендации для гидов</h4>
                  <span className={`text-lg font-bold ${
                    weather.safetyLevel === 'excellent' ? 'text-green-400' :
                    weather.safetyLevel === 'good' ? 'text-white/70' :
                    weather.safetyLevel === 'difficult' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {weather.safetyLevel === 'excellent' && 'Отличные условия'}
                    {weather.safetyLevel === 'good' && 'Хорошие условия'}
                    {weather.safetyLevel === 'difficult' && 'Сложные условия'}
                    {weather.safetyLevel === 'dangerous' && 'Опасные условия'}
                  </span>
                </div>

                <div className="space-y-2">
                  {weather.recommendations?.map((rec) => (
                    <div key={rec} className="text-white/70 text-sm">{rec}</div>
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
              <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <h4 className="text-lg font-bold text-white mb-4">Личная информация</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="guide-name" className="block text-white/70 text-sm mb-2">Имя</label>
                    <input id="guide-name" defaultValue="" placeholder="Ваше имя" className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold" />
                  </div>
                  <div>
                    <label htmlFor="guide-phone" className="block text-white/70 text-sm mb-2">Телефон</label>
                    <input id="guide-phone" defaultValue="" placeholder="+7 (XXX) XXX-XX-XX" className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold" />
                  </div>
                  <div>
                    <label htmlFor="guide-email" className="block text-white/70 text-sm mb-2">Email</label>
                    <input id="guide-email" defaultValue="" placeholder="your@email.com" className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold" />
                  </div>
                </div>
              </div>

              <div className="bg-white/15 rounded-2xl p-6 border border-white/15">
                <h4 className="text-lg font-bold text-white mb-4">Профессиональная информация</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="guide-specialization" className="block text-white/70 text-sm mb-2">Специализация</label>
                    <select id="guide-specialization" className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold">
                      <option>Горные походы</option>
                      <option>Экскурсии</option>
                      <option>Дикая природа</option>
                      <option>Рыбалка</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="guide-experience" className="block text-white/70 text-sm mb-2">Опыт работы</label>
                    <input id="guide-experience" defaultValue="" placeholder="Например: 5 лет" className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold" />
                  </div>
                  <div>
                    <label htmlFor="guide-languages" className="block text-white/70 text-sm mb-2">Языки</label>
                    <input id="guide-languages" defaultValue="" placeholder="Русский, Английский" className="w-full px-4 py-3 bg-white/15 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold" />
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
