import type { Metadata } from 'next';
import TourImportClient from './_TourImportClient';

export const metadata: Metadata = {
  title: 'Импорт туров | Кабинет оператора',
  robots: 'noindex, nofollow',
};

export default function TourImportPage() {
  return <TourImportClient />;
}
