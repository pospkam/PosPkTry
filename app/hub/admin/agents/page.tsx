import type { Metadata } from 'next';
import AgentsClient from './_AgentsClient';

export const metadata: Metadata = {
  title: 'AI и автоматизации — TourHub Admin',
};

export default function AgentsPage() {
  return <AgentsClient />;
}
