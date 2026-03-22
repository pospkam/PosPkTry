import type { Metadata } from 'next';
import { PhotosPageClient } from './_PhotosPageClient';

export const metadata: Metadata = {
  title: 'Фото | Администрирование',
};

export default function AdminPhotosPage() {
  return <PhotosPageClient />;
}
