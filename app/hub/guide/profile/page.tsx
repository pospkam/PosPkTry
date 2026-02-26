import { Metadata } from 'next';
import GuideProfileClient from './_GuideProfileClient';

export const metadata: Metadata = {
  title: 'Профиль гида | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function GuideProfilePage() {
  return <GuideProfileClient />;
}
