import type { Metadata } from 'next';
import JoinClient from './_JoinClient';

export const metadata: Metadata = {
  title: 'Стать оператором — KamchatourHub',
  description: 'Зарегистрируйтесь как туроператор Камчатки. Первый месяц без комиссии.',
};

export default function JoinPage() {
  return <JoinClient />;
}
