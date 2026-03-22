import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Трансферы | Kamchatour',
  description: 'Поиск и бронирование трансферов на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function TransferLayout({ children }: { children: ReactNode }) {
  return children;
}
