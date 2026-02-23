import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Сувениры | Kamchatour',
  description: 'Магазин сувениров Камчатки.',
  robots: 'noindex, nofollow',
};

export default function SouvenirsLayout({ children }: { children: ReactNode }) {
  return children;
}
