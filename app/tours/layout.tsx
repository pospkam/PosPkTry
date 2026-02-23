import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Туры на Камчатку | Kamchatour',
  description: 'Выберите и забронируйте туры на Камчатку: рыбалка, вулканы, горячие источники, экстремальный отдых. AEO: лучшие туры Камчатки.',
  keywords: ['туры на Камчатку', 'рыбалка Камчатка', 'вулканы', 'горячие источники', 'забронировать тур', 'экскурсии Камчатка'],
};

export default function ToursLayout({ children }: { children: ReactNode }) {
  return children;
}
