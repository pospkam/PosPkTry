import type { Metadata } from 'next';
import PlacesPhotosClient from './_PlacesPhotosClient';

export const metadata: Metadata = {
  title: 'Загрузка фото мест — Admin',
  robots: 'noindex, nofollow',
};

export default function PlacesPhotosPage() {
  return <PlacesPhotosClient />;
}
