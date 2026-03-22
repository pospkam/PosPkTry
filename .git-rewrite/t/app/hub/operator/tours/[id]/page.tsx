import type { Metadata } from 'next';
import EditTourClient from './_EditTourClient';

export const metadata: Metadata = {
  title: 'Редактирование тура | Оператор | Kamhub',
  description: 'Редактирование параметров тура',
  robots: 'noindex, nofollow',
};

export default function EditTour() {
  return <EditTourClient />;
}
