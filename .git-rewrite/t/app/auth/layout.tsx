import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Вход и регистрация | Kamchatour',
  description: 'Войдите в личный кабинет или зарегистрируйтесь на Kamchatour для бронирования туров. AEO: вход на сайт туров.',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
