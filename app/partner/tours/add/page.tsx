import type { Metadata } from 'next';
import AddTourPageClient from './_AddTourPageClient';

export const metadata: Metadata = {
  title: 'Добавить тур | Партнёр | Kamhub',
  description: 'Создание нового тура для размещения на платформе Kamhub',
};

export default function AddTourPage() {
  return <AddTourPageClient />;
}
