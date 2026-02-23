import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Поставщик жилья | Kamchatour',
  description: 'Кабинет поставщика жилья на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function StayProviderLayout({ children }: { children: ReactNode }) {
  return children;
}
