import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { Header } from '@/components/layout/Header';
import { PlannerClient } from './_PlannerClient';

export const metadata: Metadata = {
  title: 'Конструктор маршрута — Камчатка',
  description: 'Постройте идеальный маршрут по Камчатке: выберите активности, получите AI-рекомендацию и настройте каждый день поездки.',
};

export default async function PlannerPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value ?? null;
  const payload = token ? await verifyToken(token) : null;
  const initialUserId = payload?.userId ?? null;

  return (
    <>
      <Header />
      <PlannerClient initialUserId={initialUserId} />
    </>
  );
}
