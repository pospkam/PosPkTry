import type { Metadata } from 'next';
import TransferOperatorDashboardClient from './_TransferOperatorDashboardClient';

export const metadata: Metadata = {
  title: 'Кабинет оператора трансферов | Kamhub',
  description: 'Управление трансферами и маршрутами',
  robots: 'noindex, nofollow',
};

export default function TransferOperatorDashboard() {
  return <TransferOperatorDashboardClient />;
}
