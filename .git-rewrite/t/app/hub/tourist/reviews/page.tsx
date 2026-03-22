import { Metadata } from 'next';
import ReviewsClient from './_ReviewsClient';

export const metadata: Metadata = {
  title: 'Мои отзывы | Kamchatour',
  robots: 'noindex, nofollow',
};

export default function ReviewsPage() {
  return <ReviewsClient />;
}
