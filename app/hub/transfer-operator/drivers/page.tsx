import type { Metadata } from 'next';
import DriversPageClient from './_DriversPageClient';

export const metadata: Metadata = {
  title: 'Водители | Оператор трансферов | Kamhub',
  description: 'Управление водителями',
  robots: 'noindex, nofollow',
};

export default function DriversPage() {
  return <DriversPageClient />;
}
