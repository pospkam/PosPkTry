import { Metadata } from 'next';
import { SafetyDashboardClient } from './SafetyDashboardClient';

export const metadata: Metadata = {
  title: 'Safety Dashboard | KamchatourHub',
  description: 'Real-time safety monitoring and alerts',
};

export default function SafetyDashboard() {
  return <SafetyDashboardClient />;
}
