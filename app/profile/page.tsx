import type { Metadata } from 'next';
import ProfilePageClient from './_ProfilePageClient';

export const metadata = {
  title: 'Профиль пользователя | Tourhab',
  description: 'Управление профилем и настройками аккаунта на Tourhab',
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
