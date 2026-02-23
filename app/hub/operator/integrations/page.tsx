import type { Metadata } from 'next';
import IntegrationsPageClient from './_IntegrationsPageClient';

export const metadata: Metadata = {
  title: 'Интеграции | Оператор | Kamhub',
  description: 'Настройка интеграций с партнёрами',
  robots: 'noindex, nofollow',
};

export default function IntegrationsPage() {
  return <IntegrationsPageClient />;
}
