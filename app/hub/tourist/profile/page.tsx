import { Metadata } from 'next';
import ProfileClient from './_ProfileClient';

export const metadata: Metadata = {
  title: 'Профиль | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function ProfilePage() {
  return <ProfileClient />;
}
