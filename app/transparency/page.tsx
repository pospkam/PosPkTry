import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth/jwt';
import TransparencyClient from './_TransparencyClient';

export const metadata: Metadata = {
  title: 'Transparency Hub (Admin) — TourHab',
  description:
    'Внутренний отчёт для администратора: решения совета, инициативы и исполнение.',
  openGraph: {
    title: 'Transparency Hub (Admin)',
    description:
      'Внутренний отчёт управления платформой для администратора.',
    type: 'website',
  },
};

export default async function TransparencyPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'admin') {
    redirect('/auth/login?from=/transparency');
  }

  return <TransparencyClient />;
}
