import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Автопарк | Kamchatour',
  description: 'Управление автомобилями и арендой транспорта на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function CarsHubLayout({ children }: { children: ReactNode }) {
  return children;
}
