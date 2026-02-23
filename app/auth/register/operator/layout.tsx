import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Регистрация оператора | Kamchatour',
  description: 'Зарегистрируйтесь как оператор туров на Камчатке.',
};

export default function OperatorRegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
