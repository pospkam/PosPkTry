import type { Metadata } from 'next';
import AgentBookingsPageClient from './_AgentBookingsPageClient';

export const metadata: Metadata = {
  title: 'Бронирования | Агент | Kamhub',
  description: 'Управление бронированиями клиентов',
  robots: 'noindex, nofollow',
};

export default function AgentBookingsPage() {
  return <AgentBookingsPageClient />;
}
