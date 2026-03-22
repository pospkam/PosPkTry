import type { Metadata } from 'next';
import AuthPageClient from './_AuthPageClient';

export const metadata: Metadata = {
  title: 'Вход | Kamhub',
  description: 'Войдите в личный кабинет на платформе Kamhub',
};

export default function AuthPage() {
  return <AuthPageClient />;
}
