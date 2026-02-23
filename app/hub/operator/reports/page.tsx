import type { Metadata } from 'next';
import ReportsPageClient from './_ReportsPageClient';

export const metadata: Metadata = {
  title: 'Отчёты | Оператор | Kamhub',
  description: 'Аналитика и отчёты оператора туров',
  robots: 'noindex, nofollow',
};

export default function ReportsPage() {
  return <ReportsPageClient />;
}
