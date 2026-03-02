import { Metadata } from 'next';
import RoutesClient from './_RoutesClient';

export const metadata: Metadata = {
  title: 'Маршруты | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function RoutesPage() {
  return <RoutesClient />;
}
