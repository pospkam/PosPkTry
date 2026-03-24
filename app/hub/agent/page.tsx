import type { Metadata } from 'next';
import AgentDashboardClient from './_AgentDashboardClient';

export const metadata: Metadata = {
  title: 'Кабинет агента | Tourhab',
  description: 'Управление клиентами, бронированиями и комиссионными',
  robots: 'noindex, nofollow',
};

export default function AgentDashboard() {
  return <AgentDashboardClient />;
}
