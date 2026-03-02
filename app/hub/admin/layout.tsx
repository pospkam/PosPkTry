'use client';

import { ReactNode } from 'react';
import { Shield, Users, CreditCard, FileText, Settings } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';

const SIDEBAR_ITEMS = [
  { href: '/hub/admin', label: 'Обзор', icon: Shield },
  { href: '/hub/admin/users', label: 'Пользователи', icon: Users },
  { href: '/hub/admin/content/tours', label: 'Модерация туров', icon: FileText },
  { href: '/hub/admin/content/reviews', label: 'Отзывы', icon: FileText },
  { href: '/hub/admin/content/partners', label: 'Партнёры', icon: Settings },
  { href: '/hub/admin/finance', label: 'Финансы', icon: CreditCard },
];

export default function AdminHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Администрирование">
      {children}
    </HubLayout>
  );
}
