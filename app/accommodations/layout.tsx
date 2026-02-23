import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Жильё на Камчатке | Kamchatour',
  description: 'Аренда жилья на Камчатке: гостиницы, апартаменты, коттеджи. Бронирование онлайн. AEO: где остановиться на Камчатке.',
};

export default function AccommodationsLayout({ children }: { children: ReactNode }) {
  return children;
}
