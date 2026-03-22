import type { Metadata } from 'next';
import MapPageClient from './_MapPageClient';

export const metadata = {
  title: 'Карта Камчатки | Kamhub',
  description: 'Интерактивная карта Камчатки с достопримечательностями, вулканами, термальными источниками',
};

export default function MapPage() {
  return <MapPageClient />;
}
