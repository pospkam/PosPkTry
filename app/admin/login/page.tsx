import type { Metadata } from 'next';
import AdminLoginPageClient from './_AdminLoginPageClient';

export const metadata: Metadata = {
  title: 'Вход для администратора | Kamhub',
  description: 'Панель администратора Kamhub',
};

export default function AdminLoginPage() {
  return <AdminLoginPageClient />;
}
