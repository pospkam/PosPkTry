import { Metadata } from 'next';
import LoyaltyClient from './_LoyaltyClient';

export const metadata: Metadata = {
  title: 'Программа лояльности | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function LoyaltyPage() {
  return <LoyaltyClient />;
}
