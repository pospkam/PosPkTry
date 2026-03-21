import type { Metadata } from 'next';
import FindToursClient from './_FindToursClient';

export const metadata: Metadata = {
  title: 'Найти тур | Кабинет агента',
  robots: 'noindex, nofollow',
};

export default function AgentFindPage() {
  return <FindToursClient />;
}
