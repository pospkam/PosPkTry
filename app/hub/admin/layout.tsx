'use client';

import { ReactNode } from 'react';
import {
  Shield, Users, Calendar, CalendarDays, FileText, MessageSquareText,
  Briefcase, UserCheck, BarChart3, DollarSign,
  Activity, Bell, Settings, Brain, Tag, Award, ClipboardList, Plug, TrendingUp, Zap,
  Building2, HardHat, AlertTriangle,
} from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { AiAssistant } from '@/components/admin/AiAssistant';
import { ChatWidget } from '@/components/chat/ChatWidget';

const SIDEBAR_ITEMS = [
  { href: '/hub/admin', label: 'Обзор', icon: Shield },
  { href: '/hub/admin/board-meeting', label: 'Совет директоров', icon: Building2 },
  { href: '/hub/admin/leads', label: 'CRM — Лиды', icon: ClipboardList },
  { href: '/hub/admin/bookings', label: 'Бронирования', icon: Calendar },
  { href: '/hub/admin/users', label: 'Пользователи', icon: Users },
  { href: '/hub/admin/content/tours', label: 'Модерация туров', icon: FileText },
  { href: '/hub/admin/content/reviews', label: 'Отзывы', icon: MessageSquareText },
  { href: '/hub/admin/content/partners', label: 'Партнёры', icon: Briefcase },
  { href: '/hub/admin/operators', label: 'Операторы', icon: UserCheck },
  { href: '/hub/admin/guide-certifications', label: 'Сертификаты гидов', icon: Award },
  { href: '/hub/admin/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/hub/admin/calendar', label: 'Календарь', icon: CalendarDays },
  { href: '/hub/admin/finance', label: 'Финансы', icon: DollarSign },
  { href: '/hub/admin/promo-codes', label: 'Промокоды', icon: Tag },
  { href: '/hub/admin/activity', label: 'Активность', icon: Activity },
  { href: '/hub/admin/knowledge', label: 'База знаний AI', icon: Brain },
  { href: '/hub/admin/agents',   label: 'Агенты AI',      icon: Zap },
  { href: '/hub/admin/notifications', label: 'Уведомления', icon: Bell },
  { href: '/hub/admin/pricing', label: 'Динамические цены', icon: TrendingUp },
  { href: '/hub/admin/integrations', label: 'Интеграции / OCTO', icon: Plug },
  { href: '/hub/admin/safety',  label: 'Безопасность', icon: AlertTriangle },
  { href: '/hub/admin/artem',  label: 'Рабочее место МЧС', icon: HardHat },
  { href: '/hub/admin/settings', label: 'Настройки', icon: Settings },
];

export default function AdminHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Администрирование" requiredRole="admin">
      {children}
      <AiAssistant />
      <ChatWidget />
    </HubLayout>
  );
}
