import type { Metadata } from 'next';
import AgentVouchersPageClient from './_AgentVouchersPageClient';

export const metadata: Metadata = {
  title: 'Ваучеры | Агент | Kamhub',
  description: 'Создание и управление ваучерами',
  robots: 'noindex, nofollow',
};

export default function AgentVouchersPage() {
  return <AgentVouchersPageClient />;
}
