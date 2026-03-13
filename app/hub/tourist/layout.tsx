'use client';

import { ReactNode } from 'react';
import {
  Compass, Calendar, Star, Heart, Award, MessageSquare, User, Bell,
} from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { ChatWidget } from '@/components/chat/ChatWidget';

const SIDEBAR_ITEMS = [
  { href: '/hub/tourist', label: 'Обзор', icon: Compass },
  { href: '/hub/tourist/bookings', label: 'Бронирования', icon: Calendar },
  { href: '/hub/tourist/bookings/new', label: 'Новое бронирование', icon: Star },
  { href: '/hub/tourist/wishlist', label: 'Избранное', icon: Heart },
  { href: '/hub/tourist/reviews', label: 'Мои отзывы', icon: MessageSquare },
  { href: '/hub/tourist/eco-points', label: 'Эко-баллы', icon: Award },
  { href: '/hub/tourist/notifications', label: 'Уведомления', icon: Bell },
  { href: '/hub/tourist/profile', label: 'Профиль', icon: User },
];

export default function TouristLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет туриста">
      {children}
      <ChatWidget />
    </HubLayout>
  );
}
