import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Жильё | Kamchatour',
  description: 'Управление жильём и размещением на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function StayLayout({ children }: { children: ReactNode }) {
  return children;
}
