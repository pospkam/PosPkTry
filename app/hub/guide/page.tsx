import type { Metadata } from 'next';
import GuideDashboardClient from './_GuideDashboardClient';

export const metadata: Metadata = {
  title: 'Личный кабинет гида | Tourhab',
  description: 'Управление расписанием, группами и доходами гида на Tourhab',
  robots: 'noindex, nofollow',
};

export default function GuideDashboard() {
  return <GuideDashboardClient />;
}
