'use client';

import { ReactNode } from 'react';
import { CalendarDays, Users, CreditCard, Star } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';

const SIDEBAR_ITEMS = [
  { href: '/hub/guide', label: 'Обзор', icon: Star },
  { href: '/hub/guide/schedule', label: 'Расписание', icon: CalendarDays },
  { href: '/hub/guide/groups', label: 'Группы', icon: Users },
  { href: '/hub/guide/earnings', label: 'Заработок', icon: CreditCard },
];

export default function GuideHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет гида">
      {children}
    </HubLayout>
  );
}
