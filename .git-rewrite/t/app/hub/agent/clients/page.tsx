import type { Metadata } from 'next';
import AgentClientsPageClient from './_AgentClientsPageClient';

export const metadata: Metadata = {
  title: 'Клиенты | Агент | Kamhub',
  description: 'База клиентов и управление контактами',
  robots: 'noindex, nofollow',
};

export default function AgentClientsPage() {
  return <AgentClientsPageClient />;
}
