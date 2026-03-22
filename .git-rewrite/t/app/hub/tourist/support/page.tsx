import { Metadata } from 'next';
import SupportClient from './_SupportClient';

export const metadata: Metadata = {
  title: 'Поддержка | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function SupportPage() {
  return <SupportClient />;
}
