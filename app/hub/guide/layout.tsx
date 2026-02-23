import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Кабинет гида | Kamchatour',
  description: 'Управление турами, расписанием и заработком гида на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function GuideHubLayout({ children }: { children: ReactNode }) {
  return children;
}
