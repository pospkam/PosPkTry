import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Туры | Kamchatour',
  description: 'Управление турами в личном кабинете.',
  robots: 'noindex, nofollow',
};

export default function ToursLayout({ children }: { children: ReactNode }) {
  return children;
}
