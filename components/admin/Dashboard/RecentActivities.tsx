'use client';

import React from 'react';
import { RecentActivity } from '@/types/admin';
import { clsx } from 'clsx';
import { Calendar, User, Star, CreditCard, Settings, ClipboardList, LucideIcon } from 'lucide-react';

interface RecentActivitiesProps {
  activities: RecentActivity[];
  loading?: boolean;
}

const activityIcons: Record<RecentActivity['type'], LucideIcon> = {
  booking: Calendar,
  user: User,
  review: Star,
  payment: CreditCard,
  system: Settings
};

const activityColors: Record<RecentActivity['type'], string> = {
  booking: 'bg-blue-500/20 text-blue-400',
  user: 'bg-green-500/20 text-green-400',
  review: 'bg-yellow-500/20 text-yellow-400',
  payment: 'bg-purple-500/20 text-purple-400',
  system: 'bg-gray-500/20 text-gray-400'
};

export function RecentActivities({ activities, loading = false }: RecentActivitiesProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    return `${days} дн. назад`;
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Последние активности</h3>
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full bg-white/10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-3 bg-white/10 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Последние активности</h3>
        <div className="text-center py-8 text-white/50">
          <ClipboardList className="w-12 h-12 mx-auto mb-2 text-white/30" />
          <p>Пока нет активностей</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Последние активности</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start space-x-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              {/* Icon */}
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                activityColors[activity.type]
              )}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {activity.title}
                    </p>
                    <p className="text-xs text-white/70 truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-white/50 ml-2 flex-shrink-0">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
                
                {activity.user && (
                  <div className="flex items-center mt-2 text-xs text-white/60 gap-1">
                    <User className="w-3 h-3" />
                    {activity.user.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="w-full mt-4 py-2 text-sm text-premium-gold hover:text-premium-gold/80 transition-colors font-medium">
        Показать все активности →
      </button>
    </div>
  );
}



