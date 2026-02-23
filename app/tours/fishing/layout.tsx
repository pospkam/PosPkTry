import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Рыбалка на Камчатке | Kamchatour',
  description: 'Рыбалка на лосося, чавычу, кижуч, нерка на Камчатке. Лучшие туры и рыболовные базы.',
};

export default function FishingToursLayout({ children }: { children: ReactNode }) {
  return children;
}
