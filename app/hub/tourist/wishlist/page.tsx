import { Metadata } from 'next';
import WishlistClient from './_WishlistClient';

export const metadata: Metadata = {
  title: 'Избранное | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function WishlistPage() {
  return <WishlistClient />;
}
