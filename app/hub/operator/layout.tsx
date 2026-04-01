'use client';

import { ReactNode } from 'react';
import {
  BarChart3, Map, Calendar, CalendarDays, Users, CreditCard,
  Settings, Bell, FileText, ArrowLeftRight, HelpCircle, CheckCircle, Inbox, User,
  Download, Bus,
} from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { OperatorTelegramBanner } from '@/components/operator/TelegramConnectBanner';
import { ForcePasswordChangeBanner } from '@/components/operator/ForcePasswordChangeBanner';

const SIDEBAR_ITEMS = [
  { href: '/hub/operator', label: 'Обзор', icon: BarChart3 },
  { href: '/hub/operator/tours', label: 'Туры', icon: Map },
  { href: '/hub/operator/completeness', label: 'Полнота туров', icon: CheckCircle },
  { href: '/hub/operator/bookings', label: 'Бронирования', icon: Calendar },
  { href: '/hub/operator/leads', label: 'AI Заявки', icon: Inbox },
  { href: '/hub/operator/clients', label: 'Клиенты', icon: Users },
  { href: '/hub/operator/finance', label: 'Финансы', icon: CreditCard },
  { href: '/hub/operator/calendar', label: 'Календарь', icon: CalendarDays },
  { href: '/hub/operator/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/hub/operator/transfers', label: 'Трансферы', icon: ArrowLeftRight },
  { href: '/hub/transfer-operator', label: 'Автопарк', icon: Bus },
  { href: '/hub/operator/reports', label: 'Отчёты', icon: Download },
  { href: '/hub/operator/notifications', label: 'Уведомления', icon: Bell },
  { href: '/hub/operator/integrations', label: 'Интеграции', icon: Settings },
  { href: '/hub/operator/help', label: 'Справка', icon: HelpCircle },
  { href: '/hub/operator/profile', label: 'Профиль', icon: User },
];

export default function OperatorHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет оператора" requiredRole={['operator', 'admin']}>
      <ForcePasswordChangeBanner />
      <OperatorTelegramBanner />
      {children}
      <ChatWidget />
    </HubLayout>
  );
}
