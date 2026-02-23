import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Партнёр | Kamchatour',
  description: 'Кабинет партнёра туристической платформы Kamchatour.',
  robots: 'noindex, nofollow',
};

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return children;
}
