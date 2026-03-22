import { Metadata } from 'next';
import EcoPointsClient from './_EcoPointsClient';

export const metadata: Metadata = {
  title: 'Эко-баллы | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function EcoPointsPage() {
  return <EcoPointsClient />;
}
