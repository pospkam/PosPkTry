import { Metadata } from 'next';
import AIPromptsClient from './_AIPromptsClient';

export const metadata: Metadata = {
  title: 'AI-промпты | Kamchatour Admin',
  robots: 'noindex',
};

export default function AIPromptsPage() {
  return <AIPromptsClient />;
}
