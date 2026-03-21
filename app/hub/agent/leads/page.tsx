import type { Metadata } from 'next';
import LeadsClient from './_LeadsClient';

export const metadata: Metadata = {
  title: 'Входящие заявки | Кабинет агента',
  robots: 'noindex, nofollow',
};

export default function AgentLeadsPage() {
  return <LeadsClient />;
}
