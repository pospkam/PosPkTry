import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Личный кабинет | Kamchatour',
  description: 'Управление бронированиями, турами и путешествиями на Камчатке в личном кабинете. AEO: личный кабинет туриста.',
  robots: 'noindex, nofollow',
};

export default function HubLayout({ children }: { children: ReactNode }) {
  return children;
}
