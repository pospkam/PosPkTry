import { Metadata } from 'next';
import OperatorsPageClient from './_OperatorsPageClient';

export const metadata: Metadata = {
  title: 'Партнёры TourHab — проверенные операторы Камчатки',
  description: 'Каталог проверенных туроператоров, гидов и баз Камчатки. Рыбалка, вертолётные туры, трекинг, снегоходы — выбирайте своего оператора.',
  openGraph: {
    title: 'Партнёры TourHab',
    description: 'Проверенные операторы и гиды Камчатки',
    url: 'https://tourhab.ru/operators',
  },
};

export default function OperatorsPage() {
  return <OperatorsPageClient />;
}
