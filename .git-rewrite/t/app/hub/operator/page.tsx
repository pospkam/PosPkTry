import type { Metadata } from 'next';
import OperatorDashboardClient from './_OperatorDashboardClient';

export const metadata: Metadata = {
  title: 'Кабинет оператора | Kamhub',
  description: 'Управление турами, бронированиями и клиентами оператора',
  robots: 'noindex, nofollow',
};

export default function OperatorDashboard() {
  return <OperatorDashboardClient />;
}
