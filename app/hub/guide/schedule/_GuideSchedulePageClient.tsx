'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { GuideNav } from '@/components/guide/GuideNav';
import { LoadingSpinner } from '@/components/admin/shared';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface ScheduleItem {
  id: string;
  tourName: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  status: 'upcoming' | 'in_progress' | 'completed';
}

export default function GuideSchedulePageClient() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  const fetchSchedule = async () => {
    try {
      const response = await fetch(`/api/guide/schedule?date=${selectedDate}`);
      const data = await response.json();
      if (data.success && data.data) {
        setSchedule(data.data);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-400';
      case 'in_progress': return 'bg-green-500/20 text-green-400';
      case 'completed': return 'bg-white/10 text-white/50';
      default: return 'bg-white/10 text-white/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Предстоит';
      case 'in_progress': return 'В процессе';
      case 'completed': return 'Завершен';
      default: return status;
    }
  };

  return (
    <Protected roles={['guide', 'operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <GuideNav />
        
        <div className="bg-white/15 border-b border-white/15 p-6">
          <h1 className="text-3xl font-black text-white">Расписание</h1>
          <p className="text-white/70">Ваши предстоящие туры</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Date Selector */}
          <div className="mb-6">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          {loading ? (
            <LoadingSpinner message="Загрузка расписания..." />
          ) : schedule.length === 0 ? (
            <div className="bg-white/10 border border-white/20 rounded-xl p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-white/30" />
              <h2 className="text-xl font-bold mb-2">Нет запланированных туров</h2>
              <p className="text-white/50">На выбранную дату туры не назначены</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedule.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{item.tourName}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-white/70">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {item.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {item.participants} чел.
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}
