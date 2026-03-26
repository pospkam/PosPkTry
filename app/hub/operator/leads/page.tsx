import type { Metadata } from 'next';
import LeadsClient from './_LeadsClient';

export const metadata: Metadata = {
  title: 'AI Lead Processor | Operator Hub',
};

export default function LeadsPage() {
  return <LeadsClient />;
}
