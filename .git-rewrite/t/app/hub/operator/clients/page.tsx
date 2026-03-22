import type { Metadata } from 'next';
import ClientsPageClient from './_ClientsPageClient';

export const metadata: Metadata = {
  title: 'Клиенты | Оператор | Kamhub',
  description: 'База клиентов и история обращений',
  robots: 'noindex, nofollow',
};

export default function ClientsPage() {
  return <ClientsPageClient />;
}
