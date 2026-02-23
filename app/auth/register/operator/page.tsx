import type { Metadata } from 'next';
import OperatorRegisterPageClient from './_OperatorRegisterPageClient';

export const metadata: Metadata = {
  title: 'Регистрация оператора | Kamhub',
  description: 'Зарегистрируйтесь как оператор туров на Kamhub',
};

export default function OperatorRegisterPage() {
  return <OperatorRegisterPageClient />;
}
