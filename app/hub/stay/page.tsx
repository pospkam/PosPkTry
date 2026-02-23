import type { Metadata } from 'next';
import StayHubClient from './_StayHubClient';

export const metadata: Metadata = {
  title: 'Проживание | Kamhub',
  description: 'Поиск и бронирование проживания на Камчатке',
  robots: 'noindex, nofollow',
};

export default function StayHub() {
  return <StayHubClient />;
}
