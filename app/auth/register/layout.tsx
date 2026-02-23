import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Регистрация | Kamchatour',
  description: 'Зарегистрируйтесь на Kamchatour для бронирования туров на Камчатке.',
};

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
