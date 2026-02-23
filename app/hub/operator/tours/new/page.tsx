import type { Metadata } from 'next';
import NewTourClient from './_NewTourClient';

export const metadata: Metadata = {
  title: 'Новый тур | Оператор | Kamhub',
  description: 'Создание нового тура на Камчатке',
  robots: 'noindex, nofollow',
};

export default function NewTour() {
  return <NewTourClient />;
}
