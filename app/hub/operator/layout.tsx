'use client';

import { ReactNode } from 'react';
import {
  BarChart3, Map, Calendar, CalendarDays, Users, CreditCard,
  Settings, Bell, FileText, ArrowLeftRight,
} from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { ChatWidget } from '@/components/chat/ChatWidget';

const SIDEBAR_ITEMS = [
  { href: '/hub/operator', label: 'Обзор', icon: BarChart3 },
  { href: '/hub/operator/tours', label: 'Туры', icon: Map },
  { href: '/hub/operator/bookings', label: 'Бронирования', icon: Calendar },
  { href: '/hub/operator/clients', label: 'Клиенты', icon: Users },
  { href: '/hub/operator/finance', label: 'Финансы', icon: CreditCard },
  { href: '/hub/operator/calendar', label: 'Календарь', icon: CalendarDays },
  { href: '/hub/operator/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/hub/operator/transfers', label: 'Трансферы', icon: ArrowLeftRight },
  { href: '/hub/operator/reports', label: 'Отчёты', icon: FileText },
  { href: '/hub/operator/notifications', label: 'Уведомления', icon: Bell },
  { href: '/hub/operator/integrations', label: 'Интеграции', icon: Settings },
];

export default function OperatorHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет оператора" requiredRole={['operator', 'admin']}>
      {children}
      <ChatWidget />
    </HubLayout>
  );
}
