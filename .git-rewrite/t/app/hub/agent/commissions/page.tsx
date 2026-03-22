import type { Metadata } from 'next';
import AgentCommissionsPageClient from './_AgentCommissionsPageClient';

export const metadata: Metadata = {
  title: 'Комиссионные | Агент | Kamhub',
  description: 'Статистика и управление комиссионными агента',
  robots: 'noindex, nofollow',
};

export default function AgentCommissionsPage() {
  return <AgentCommissionsPageClient />;
}
