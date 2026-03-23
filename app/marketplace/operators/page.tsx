import { Metadata } from 'next';
import OperatorsPageClient from './_OperatorsClient';

export const metadata: Metadata = {
  title: 'Операторы Камчатки | KamchatourHub',
  description: 'Проверенные туристические операторы Камчатки — экскурсии, рыбалка, треккинг, вертолётные туры',
};

export default function OperatorsMarketplacePage() {
  return <OperatorsPageClient />;
}
