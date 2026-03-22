'use client';

import React, { useState, useEffect } from 'react';
import { Weather } from '@/types';
import {
  Star, Wind, AlertTriangle, AlertCircle, DollarSign, BarChart3, TrendingUp, Droplets,
  Eye, Calendar, Users, User, Cloud, Loader2,
} from 'lucide-react';

interface ScheduleItem {
  id: string; startTime: string; endTime: string; title: string;
  tourTitle: string | null; currentParticipants: number; maxParticipants: number;
  status: string; locationName: string | null;
}

interface GroupItem {
  id: string; groupName: string; tourName: string; tourDate: string;
  participants: { name: string; phone?: string; experience?: string }[];
  emergencyContacts: string[]; specialNeeds: string | null;
}

interface EarningsStats {
  totalCount: number; totalEarned: number; totalPaid: number;
  totalPending: number; totalCommission: number; avgCommissionRate: number;
}

interface EarningItem {
  id: string; amount: number; paymentStatus: string;
  tourName: string | null; tourDate: string | null; createdAt: string;
}

const TABS = [
  { id: 'schedule', name: 'Расписание', Icon: Calendar },
  { id: 'groups', name: 'Группы', Icon: Users },
  { id: 'earnings', name: 'Доходы', Icon: DollarSign },
  { id: 'weather', name: 'Погода', Icon: Cloud },
  { id: 'profile', name: 'Профиль', Icon: User },
];

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';

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

  useEffect(() => { fetchWeather(); fetchSchedule(); }, []);

  useEffect(() => {
    if (selectedTab === 'groups' && !groupsFetched && !groupsLoading) fetchGroups();
    if (selectedTab === 'earnings' && !earningsFetched && !earningsLoading) fetchEarnings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather?lat=53.0375&lng=158.6556&location=Петропавловск-Камчатский');
      const data = await res.json();
      if (data.success) setWeather(data.data);
    } finally { setLoading(false); }
  };

  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const res = await fetch('/api/guide/schedule');
      const data = await res.json();
      if (data.success) {
        setSchedule((data.data ?? []).map((item: Record<string, unknown>) => ({
          id: item.id, startTime: item.startTime, endTime: item.endTime,
          title: item.title, tourTitle: item.tourTitle ?? null,
          currentParticipants: (item.currentParticipants as number) ?? 0,
          maxParticipants: (item.maxParticipants as number) ?? 0,
          status: item.status, locationName: item.locationName ?? null,
        })));
      }
    } finally { setScheduleLoading(false); }
  };

  const fetchGroups = async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/guide/groups');
      const data = await res.json();
      if (data.success) setGroups(data.data ?? []);
    } finally { setGroupsLoading(false); setGroupsFetched(true); }
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
    } finally { setEarningsLoading(false); setEarningsFetched(true); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Star className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Панель гида</h1>
        </div>
        {weather && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] font-mono">{weather.temperature}°C · {weather.location}</span>
            <div className="flex items-center gap-1 text-xs text-[var(--warning)]">
              <Star className="w-3 h-3" /> 4.9
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.Icon;
          return (
            <button key={tab.id} onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedTab === tab.id
                  ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Schedule Tab */}
      {selectedTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Расписание туров</p>
            <button className="px-3 py-1.5 text-xs bg-[var(--accent)] text-[var(--bg-card)] rounded-md hover:opacity-90 transition-opacity">
              + Доступность
            </button>
          </div>
          {scheduleLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>
          ) : schedule.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">Расписание пусто. Добавьте доступность для приёма заявок.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.map(item => {
                const start = new Date(item.startTime);
                return (
                  <div key={item.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.tourTitle ?? item.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {start.toLocaleDateString('ru-RU')} в {start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        ['confirmed', 'available'].includes(item.status)
                          ? 'bg-[var(--success)]/10 text-[var(--success)]'
                          : 'bg-[var(--warning)]/10 text-[var(--warning)]'
                      }`}>
                        {['confirmed', 'available'].includes(item.status) ? 'Подтверждено' : 'Ожидает'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-[var(--text-secondary)] mb-3">
                      <div><span className="text-[var(--text-muted)]">Место: </span>{item.locationName ?? 'Уточняется'}</div>
                      <div><span className="text-[var(--text-muted)]">Участники: </span>{item.currentParticipants}/{item.maxParticipants}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-card)] transition-colors">
                        Подробности
                      </button>
                      <button className="px-3 py-1.5 text-xs text-[var(--bg-card)] bg-[var(--accent)] rounded-md hover:opacity-90 transition-opacity">
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
        <div className="space-y-4">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Управление группами</p>
          {groupsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>
          ) : groups.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">Групп пока нет.</p>
            </div>
          ) : groups.map(group => (
            <div key={group.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{group.tourName}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {group.tourDate ? new Date(group.tourDate).toLocaleDateString('ru-RU') : ''} · {group.participants.length} участников
                  </p>
                </div>
                <button className="px-3 py-1.5 text-xs text-[var(--bg-card)] bg-[var(--accent)] rounded-md hover:opacity-90 transition-opacity">
                  Связаться
                </button>
              </div>
              {group.participants.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2">Участники</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.participants.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-3 py-2">
                        <span className="text-xs text-[var(--text-primary)]">{p.name}</span>
                        {p.experience && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.experience === 'Опытный' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                            {p.experience}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {group.specialNeeds && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-md">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                  <p className="text-xs text-[var(--warning)]">{group.specialNeeds}</p>
                </div>
              )}
              {group.emergencyContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md mb-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                  <p className="text-xs text-[var(--danger)]">{contact}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Earnings Tab */}
      {selectedTab === 'earnings' && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Доходы и выплаты</p>
          {earningsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>
          ) : earningsStats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Всего заработано', value: `${earningsStats.totalEarned.toLocaleString('ru-RU')} ₽`, icon: DollarSign },
                  { label: 'Выплачено', value: `${earningsStats.totalPaid.toLocaleString('ru-RU')} ₽`, icon: BarChart3 },
                  { label: 'Ожидает', value: `${earningsStats.totalPending.toLocaleString('ru-RU')} ₽`, icon: TrendingUp },
                  { label: 'Туров', value: String(earningsStats.totalCount), icon: Calendar },
                ].map(kpi => {
                  const Icon = kpi.icon;
                  return (
                    <div key={kpi.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">{kpi.label}</p>
                          <span className="text-lg font-semibold font-mono text-[var(--text-primary)]">{kpi.value}</span>
                        </div>
                        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </div>
                  );
                })}
              </div>
              {earnings.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[var(--border)]">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Последние поступления</p>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {earnings.slice(0, 8).map(e => (
                      <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <span className="text-xs text-[var(--text-primary)]">{e.tourName ?? 'Тур'}</span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-2 font-mono">
                            {e.tourDate ? new Date(e.tourDate).toLocaleDateString('ru-RU') : new Date(e.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.paymentStatus === 'paid' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>
                            {e.paymentStatus === 'paid' ? 'Выплачено' : 'Ожидает'}
                          </span>
                          <span className="text-xs font-mono font-medium text-[var(--text-primary)]">{e.amount.toLocaleString('ru-RU')} ₽</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-8 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">Данные о доходах не найдены.</p>
            </div>
          )}
        </div>
      )}

      {/* Weather Tab */}
      {selectedTab === 'weather' && weather && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Температура', value: `${weather.temperature}°C`, sub: weather.condition, icon: Cloud },
              { label: 'Ветер', value: `${weather.windSpeed} км/ч`, icon: Wind },
              { label: 'Влажность', value: `${weather.humidity}%`, icon: Droplets },
              { label: 'Видимость', value: `${weather.visibility} км`, icon: Eye },
            ].map(w => {
              const Icon = w.icon;
              return (
                <div key={w.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{w.label}</p>
                    <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <span className="text-lg font-semibold font-mono text-[var(--text-primary)]">{w.value}</span>
                  {w.sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 capitalize">{w.sub}</p>}
                </div>
              );
            })}
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Рекомендации для гидов</p>
              <span className={`text-xs font-medium ${
                weather.safetyLevel === 'excellent' ? 'text-[var(--success)]' :
                weather.safetyLevel === 'good' ? 'text-[var(--text-secondary)]' :
                weather.safetyLevel === 'difficult' ? 'text-[var(--warning)]' : 'text-[var(--danger)]'
              }`}>
                {weather.safetyLevel === 'excellent' && 'Отличные условия'}
                {weather.safetyLevel === 'good' && 'Хорошие условия'}
                {weather.safetyLevel === 'difficult' && 'Сложные условия'}
                {weather.safetyLevel === 'dangerous' && 'Опасные условия'}
              </span>
            </div>
            <div className="space-y-1.5">
              {weather.recommendations?.map(rec => (
                <p key={rec} className="text-xs text-[var(--text-secondary)]">{rec}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {selectedTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Личная информация</p>
            {[
              { id: 'g-name', label: 'Имя', placeholder: 'Ваше имя' },
              { id: 'g-phone', label: 'Телефон', placeholder: '+7 (XXX) XXX-XX-XX' },
              { id: 'g-email', label: 'Email', placeholder: 'your@email.com' },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{f.label}</label>
                <input id={f.id} defaultValue="" placeholder={f.placeholder} className={INPUT} />
              </div>
            ))}
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Профессиональная информация</p>
            <div>
              <label htmlFor="g-spec" className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Специализация</label>
              <select id="g-spec" className={INPUT}>
                <option>Горные походы</option>
                <option>Экскурсии</option>
                <option>Дикая природа</option>
                <option>Рыбалка</option>
              </select>
            </div>
            {[
              { id: 'g-exp', label: 'Опыт работы', placeholder: 'Например: 5 лет' },
              { id: 'g-lang', label: 'Языки', placeholder: 'Русский, Английский' },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{f.label}</label>
                <input id={f.id} defaultValue="" placeholder={f.placeholder} className={INPUT} />
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 flex justify-end">
            <button className="px-4 py-2 text-xs font-medium bg-[var(--accent)] text-[var(--bg-card)] rounded-md hover:opacity-90 transition-opacity">
              Сохранить изменения
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
