import { Metadata } from 'next';
import { LeadsClient } from './_LeadsClient';

export const metadata: Metadata = {
  title: 'CRM — Лиды | Kamchatour',
  robots: 'noindex',
};

export default function AdminLeadsPage() {
  return <LeadsClient />;
}
