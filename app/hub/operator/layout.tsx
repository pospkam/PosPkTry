import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Оператор | Kamchatour',
  description: 'Кабинет туроператора на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function OperatorHubLayout({ children }: { children: ReactNode }) {
  return children;
}
