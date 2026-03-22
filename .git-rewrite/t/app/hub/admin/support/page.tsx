import { Metadata } from 'next';
import AdminSupportClient from './_AdminSupportClient';

export const metadata: Metadata = {
  title: 'Поддержка | Администрирование',
  robots: 'noindex, nofollow',
};

export default function AdminSupportPage() {
  return <AdminSupportClient />;
}
