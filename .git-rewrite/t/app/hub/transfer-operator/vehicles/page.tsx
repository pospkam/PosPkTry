import type { Metadata } from 'next';
import VehiclesPageClient from './_VehiclesPageClient';

export const metadata: Metadata = {
  title: 'Транспорт | Оператор трансферов | Kamhub',
  description: 'Управление транспортными средствами',
  robots: 'noindex, nofollow',
};

export default function VehiclesPage() {
  return <VehiclesPageClient />;
}
