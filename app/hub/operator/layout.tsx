'use client';

import { ReactNode } from 'react';
import { BarChart3, Map, Calendar, Users, CreditCard, Settings } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';

const SIDEBAR_ITEMS = [
  { href: '/hub/operator', label: 'Обзор', icon: BarChart3 },
  { href: '/hub/operator/tours', label: 'Туры', icon: Map },
  { href: '/hub/operator/bookings', label: 'Бронирования', icon: Calendar },
  { href: '/hub/operator/clients', label: 'Клиенты', icon: Users },
  { href: '/hub/operator/finance', label: 'Финансы', icon: CreditCard },
  { href: '/hub/operator/calendar', label: 'Календарь', icon: Calendar },
  { href: '/hub/operator/integrations', label: 'Интеграции', icon: Settings },
];

export default function OperatorHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет оператора">
      {children}
    </HubLayout>
  );
}
