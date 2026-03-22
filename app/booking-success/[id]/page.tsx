import { Metadata } from 'next';
import BookingSuccessClient from './_BookingSuccessClient';

export const metadata: Metadata = {
  title: 'Бронирование подтверждено | Туры Камчатки',
  description: 'Ваше бронирование тура успешно создано'
};

export default function BookingSuccessPage() {
  return <BookingSuccessClient />;
}
