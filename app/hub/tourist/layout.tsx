'use client';

import { ReactNode } from 'react';
import { Compass, Calendar, Star, Heart, Award } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';

const SIDEBAR_ITEMS = [
  { href: '/hub/tourist', label: 'Обзор', icon: Compass },
  { href: '/hub/tourist/bookings', label: 'Бронирования', icon: Calendar },
  { href: '/hub/tourist/bookings/new', label: 'Новое бронирование', icon: Star },
  { href: '/hub/tours', label: 'Туры', icon: Heart },
  { href: '/eco', label: 'Эко-баллы', icon: Award },
];

export default function TouristLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Кабинет туриста">
      {children}
    </HubLayout>
  );
}
