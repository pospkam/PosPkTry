import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth/jwt';
import { SafetyDashboardClient } from './SafetyDashboardClient';

export const metadata: Metadata = {
  title: 'Safety Dashboard | KamchatourHub',
  description: 'Real-time safety monitoring and alerts',
};

export default async function SafetyDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'admin') {
    redirect('/auth/login?from=/hub/admin/safety');
  }

  return <SafetyDashboardClient />;
}
