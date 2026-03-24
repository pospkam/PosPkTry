import type { Metadata } from 'next';
import AuthPageClient from './_AuthPageClient';

export const metadata: Metadata = {
  title: 'Вход | Tourhab',
  description: 'Войдите в личный кабинет на платформе Tourhab',
};

export default function AuthPage() {
  return <AuthPageClient />;
}
