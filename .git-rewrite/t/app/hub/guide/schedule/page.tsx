import type { Metadata } from 'next';
import GuideSchedulePageClient from './_GuideSchedulePageClient';

export const metadata: Metadata = {
  title: 'Расписание | Гид | Kamhub',
  description: 'Расписание туров и экскурсий гида',
  robots: 'noindex, nofollow',
};

export default function GuideSchedulePage() {
  return <GuideSchedulePageClient />;
}
