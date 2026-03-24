import type { Metadata } from 'next';
import CalendarPageClient from './_CalendarPageClient';

export const metadata: Metadata = {
  title: 'Календарь | Оператор | Tourhab',
  description: 'Календарь туров и доступности слотов',
  robots: 'noindex, nofollow',
};

export default function CalendarPage() {
  return <CalendarPageClient />;
}
