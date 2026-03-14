'use client';

import { ReactNode } from 'react';
import { Users, FileText, CreditCard, BarChart3, TrendingUp } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';

const SIDEBAR_ITEMS = [
  { href: '/hub/agent', label: 'Обзор', icon: BarChart3 },
  { href: '/hub/agent/clients', label: 'Клиенты', icon: Users },
  { href: '/hub/agent/vouchers', label: 'Ваучеры', icon: FileText },
  { href: '/hub/agent/commissions', label: 'Комиссии', icon: CreditCard },
  { href: '/hub/agent/stats', label: 'Статистика', icon: TrendingUp },
];

export default function AgentHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет агента" requiredRole="agent">
      {children}
    </HubLayout>
  );
}
