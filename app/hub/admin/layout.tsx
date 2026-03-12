'use client';

import { ReactNode } from 'react';
import {
  Shield, Users, Calendar, CalendarDays, FileText, MessageSquareText,
  Briefcase, UserCheck, BarChart3, DollarSign,
  Activity, Bell, Settings,
} from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';

const SIDEBAR_ITEMS = [
  { href: '/hub/admin', label: 'Обзор', icon: Shield },
  { href: '/hub/admin/bookings', label: 'Бронирования', icon: Calendar },
  { href: '/hub/admin/users', label: 'Пользователи', icon: Users },
  { href: '/hub/admin/content/tours', label: 'Модерация туров', icon: FileText },
  { href: '/hub/admin/content/reviews', label: 'Отзывы', icon: MessageSquareText },
  { href: '/hub/admin/content/partners', label: 'Партнёры', icon: Briefcase },
  { href: '/hub/admin/operators', label: 'Операторы', icon: UserCheck },
  { href: '/hub/admin/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/hub/admin/calendar', label: 'Календарь', icon: CalendarDays },
  { href: '/hub/admin/finance', label: 'Финансы', icon: DollarSign },
  { href: '/hub/admin/activity', label: 'Активность', icon: Activity },
  { href: '/hub/admin/notifications', label: 'Уведомления', icon: Bell },
  { href: '/hub/admin/settings', label: 'Настройки', icon: Settings },
];

export default function AdminHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Администрирование">
      {children}
    </HubLayout>
  );
}
