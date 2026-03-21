import { Metadata } from 'next';
import CompletenessClient from './_CompletenessClient';

export const metadata: Metadata = {
  title: 'Полнота туров | Оператор | Kamhub',
  description: 'Проверка заполненности полей туров',
  robots: 'noindex, nofollow',
};

export default function CompletenessPage() {
  return <CompletenessClient />;
}
