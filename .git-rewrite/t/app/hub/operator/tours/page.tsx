import type { Metadata } from 'next';
import ToursManagementClient from './_ToursManagementClient';

export const metadata: Metadata = {
  title: 'Мои туры | Оператор | Kamhub',
  description: 'Управление каталогом туров оператора',
  robots: 'noindex, nofollow',
};

export default function ToursManagement() {
  return <ToursManagementClient />;
}
