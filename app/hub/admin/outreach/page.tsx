import { Metadata } from 'next';
import OutreachClient from './_OutreachClient';

export const metadata: Metadata = {
  title: 'Аутрич-очередь | Admin | TourHab',
  robots: 'noindex, nofollow',
};

export default function OutreachPage() {
  return <OutreachClient />;
}
