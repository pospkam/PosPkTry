import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Трансфер-оператор | Kamchatour',
  description: 'Управление трансферами и транспортом на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function TransferOperatorLayout({ children }: { children: ReactNode }) {
  return children;
}
