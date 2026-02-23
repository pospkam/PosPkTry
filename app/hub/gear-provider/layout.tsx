import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Поставщик снаряжения | Kamchatour',
  description: 'Кабинет поставщика туристического снаряжения.',
  robots: 'noindex, nofollow',
};

export default function GearProviderHubLayout({ children }: { children: ReactNode }) {
  return children;
}
