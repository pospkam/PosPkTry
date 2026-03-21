'use client';

import { ReactNode } from 'react';
import {
  LayoutDashboard, Inbox, Search, Users, Handshake, CreditCard,
} from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';

const SIDEBAR_ITEMS = [
  { href: '/hub/agent',             label: 'Обзор',     icon: LayoutDashboard },
  { href: '/hub/agent/leads',       label: 'Заявки',    icon: Inbox           },
  { href: '/hub/agent/find',        label: 'Найти тур', icon: Search          },
  { href: '/hub/agent/clients',     label: 'Клиенты',   icon: Users           },
  { href: '/hub/agent/bookings',    label: 'Сделки',    icon: Handshake       },
  { href: '/hub/agent/commissions', label: 'Комиссии',  icon: CreditCard      },
];

export default function AgentHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет агента" requiredRole="agent">
      {children}
    </HubLayout>
  );
}
