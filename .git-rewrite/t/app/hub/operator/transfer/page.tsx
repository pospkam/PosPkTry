import type { Metadata } from 'next';
import TransferOperatorPageClient from './_TransferOperatorPageClient';

export const metadata: Metadata = {
  title: 'Трансферы | Оператор | Kamhub',
  description: 'Управление трансферами для туристов',
  robots: 'noindex, nofollow',
};

export default function TransferOperatorPage() {
  return <TransferOperatorPageClient />;
}
