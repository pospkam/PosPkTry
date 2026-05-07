'use client';

import { ReactNode } from 'react';
import {
  Compass, Calendar, Star, Heart, Award, MessageSquare, User, Bell, Route,
  ShoppingCart, LifeBuoy, Trophy, Mail,
} from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';
import { ChatWidget } from '@/components/chat/ChatWidget';

const SIDEBAR_ITEMS = [
  { href: '/hub/tourist',              label: 'Обзор',             icon: Compass },
  { href: '/hub/tourist/trips',        label: 'Мои маршруты',      icon: Route },
  { href: '/hub/tourist/bookings',     label: 'Бронирования',      icon: Calendar },
  { href: '/marketplace',              label: 'Найти тур',         icon: Star },
  { href: '/hub/tourist/cart',         label: 'Корзина',           icon: ShoppingCart },
  { href: '/hub/tourist/wishlist',     label: 'Избранное',         icon: Heart },
  { href: '/hub/tourist/reviews',      label: 'Мои отзывы',        icon: MessageSquare },
  { href: '/hub/tourist/messages',     label: 'Сообщения',         icon: Mail },
  { href: '/hub/tourist/loyalty',      label: 'Лояльность',        icon: Trophy },
  { href: '/hub/tourist/eco-points',   label: 'Эко-баллы',         icon: Award },
  { href: '/hub/tourist/notifications',label: 'Уведомления',       icon: Bell },
  { href: '/hub/tourist/support',      label: 'Поддержка',         icon: LifeBuoy },
  { href: '/hub/tourist/profile',      label: 'Профиль',           icon: User },
];

export default function TouristLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет туриста" requiredRole="tourist">
      {children}
      <ChatWidget />
    </HubLayout>
  );
}
