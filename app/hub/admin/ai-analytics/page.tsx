import { Metadata } from 'next';
import AIAnalyticsClient from './_AIAnalyticsClient';

export const metadata: Metadata = {
  title: 'AI-аналитика | Kamchatour Admin',
  robots: 'noindex',
};

export default function AIAnalyticsPage() {
  return <AIAnalyticsClient />;
}
