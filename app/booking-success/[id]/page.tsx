import { Metadata } from 'next';
import BookingSuccessClient from './_BookingSuccessClient';

export const metadata: Metadata = {
  title: 'Заявка на тур создана | TourHab',
  description: 'Проверьте детали заявки, при необходимости уточните условия и затем перейдите к оплате.'
};

export default function BookingSuccessPage() {
  return <BookingSuccessClient />;
}
