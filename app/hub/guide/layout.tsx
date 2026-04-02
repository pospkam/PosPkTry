'use client';

import { ReactNode } from 'react';
import { CalendarDays, Users, CreditCard, Star, MessageSquare, User, Map } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { ChatWidget } from '@/components/chat/ChatWidget';

const SIDEBAR_ITEMS = [
  { href: '/hub/guide',          label: 'Обзор',      icon: Star          },
  { href: '/hub/guide/tours',    label: 'Мои туры',   icon: Map           },
  { href: '/hub/guide/schedule', label: 'Расписание', icon: CalendarDays  },
  { href: '/hub/guide/groups',   label: 'Группы',     icon: Users         },
  { href: '/hub/guide/earnings', label: 'Заработок',  icon: CreditCard    },
  { href: '/hub/guide/reviews',  label: 'Отзывы',     icon: MessageSquare },
  { href: '/hub/guide/profile',  label: 'Профиль',    icon: User          },
];

export default function GuideHubLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет гида" requiredRole="guide">
      {children}
      <ChatWidget />
    </HubLayout>
  );
}
