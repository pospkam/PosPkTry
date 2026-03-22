import type { Metadata } from 'next';
import FinancePageClient from './_FinancePageClient';

export const metadata: Metadata = {
  title: 'Финансы | Оператор | Kamhub',
  description: 'Финансовый учёт и статистика оператора',
  robots: 'noindex, nofollow',
};

export default function FinancePage() {
  return <FinancePageClient />;
}
