import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Бронирования туриста | Kamchatour',
  description: 'Мои бронирования и путешествия на Камчатке.',
  robots: 'noindex, nofollow',
};

export default function TouristLayout({ children }: { children: ReactNode }) {
  return children;
}
