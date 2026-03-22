'use client';

import { ReactNode } from 'react';
import { Truck, Users, Car, Route, Calendar } from 'lucide-react';
import { HubLayout } from '@/components/layout/HubLayout';

const SIDEBAR_ITEMS = [
  { href: '/hub/transfer-operator', label: 'Обзор', icon: Truck },
  { href: '/hub/transfer-operator/vehicles', label: 'Автопарк', icon: Car },
  { href: '/hub/transfer-operator/drivers', label: 'Водители', icon: Users },
  { href: '/hub/transfer-operator/routes', label: 'Маршруты', icon: Route },
  { href: '/hub/transfer-operator/bookings', label: 'Бронирования', icon: Calendar },
];

export default function TransferOperatorLayout({ children }: { children: ReactNode }) {
  return (
    <HubLayout sidebarItems={SIDEBAR_ITEMS} sidebarTitle="Трансфер-оператор" requiredRole={['transfer_operator', 'transfer']}>
      {children}
    </HubLayout>
  );
}
