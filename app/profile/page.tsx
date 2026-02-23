import type { Metadata } from 'next';
import ProfilePageClient from './_ProfilePageClient';

export const metadata = {
  title: 'Профиль пользователя | Kamhub',
  description: 'Управление профилем и настройками аккаунта на Kamhub',
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
