import type { Metadata } from 'next';
import JoinClient from './_JoinClient';

export const metadata: Metadata = {
  title: 'Стать оператором — TourHab',
  description: 'Разместите свои туры на платформе TourHab и получайте бронирования от туристов со всей России.',
};

export default function JoinPage() {
  return <JoinClient />;
}
