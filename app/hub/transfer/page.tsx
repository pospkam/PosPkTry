import type { Metadata } from 'next';
import TransferDashboardClient from './_TransferDashboardClient';

export const metadata: Metadata = {
  title: 'Трансферы | Kamhub',
  description: 'Заказ и управление трансферами на Камчатке',
  robots: 'noindex, nofollow',
};

export default function TransferDashboard() {
  return <TransferDashboardClient />;
}
