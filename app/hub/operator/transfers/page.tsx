import { Metadata } from 'next';
import TransfersClient from './_TransfersClient';

export const metadata: Metadata = {
  title: 'Переброс бронирований | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function TransfersPage() {
  return <TransfersClient />;
}
